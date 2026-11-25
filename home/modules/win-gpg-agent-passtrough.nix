{
  config,
  lib,
  pkgs,
  ...
}: let
  cfg = config.tl.services.win-gpg-agent;

  socketDefaultNames = {
    gpg = "S.gpg-agent";
    extra = "S.gpg-agent.extra";
    ssh = "S.gpg-agent.ssh";
  };

  mkSocketOption = name: desc: {
    enable = lib.mkEnableOption desc // {default = true;};

    windowsRelativePath = lib.mkOption {
      type = lib.types.str;
      description = "Socket path relative to windowsSocketsPath";
      default = socketDefaultNames.${name};
    };

    wslRelativePath = lib.mkOption {
      type = lib.types.str;
      description = "Socket path relative to wslSocketsPath";
      default = socketDefaultNames.${name};
    };
  };

  powershell = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";

  # Prints a `gpgconf --list-dirs` entry as a Windows path with forward slashes: gpgconf escapes ':' as %3a,
  # and socat would read the backslashes in the relay's command line as escapes.
  gpgconfDir = pkgs.writeShellScript "gpgconf-dir" ''
    cd /mnt/c
    "$(/bin/wslpath -u ${lib.escapeShellArg cfg.gpgconf})" --list-dirs "$1" | tr -d '\r' | sed -e 's/%3a/:/gI' -e 's#\\#/#g'
  '';

  # Idempotent: gpg-agent.conf with this pinentry, the pinentry's fallback, autostart, a running agent, and
  # the move away from win-gpg-agent's agent-gui. GnuPG and the fallback pinentry are installed by hand.
  provisionScript = pkgs.writeText "win-gpg-agent-provision.ps1" ''
    param([string]$Gpgconf, [string]$Pinentry, [string]$Fallback, [string]$ExtraConfig)
    $ErrorActionPreference = 'Stop'

    if (-not (Test-Path -LiteralPath $Gpgconf)) {
      throw "gpgconf.exe not found at '$Gpgconf': install GnuPG 2.4+ (winget install GnuPG.GnuPG) and set tl.services.win-gpg-agent.gpgconf"
    }
    function Get-GpgDir([string]$Name) {
      ((& $Gpgconf --list-dirs $Name) -replace '%3a', ':').Trim()
    }
    $restart = $false

    # On the Windows disk: gpg-agent starts the pinentry when WSL is not running too
    $pinentryDir = Join-Path $env:LOCALAPPDATA 'credential-store-pinentry'
    $pinentryExe = Join-Path $pinentryDir 'credential-store-pinentry.exe'
    if (-not (Test-Path -LiteralPath $pinentryExe) -or (Get-FileHash $pinentryExe).Hash -ne (Get-FileHash -LiteralPath $Pinentry).Hash) {
      New-Item -ItemType Directory -Force -Path $pinentryDir | Out-Null
      Copy-Item -LiteralPath $Pinentry -Destination $pinentryExe -Force
    }

    if (-not $Fallback) { $Fallback = Join-Path (Get-GpgDir bindir) 'pinentry-basic.exe' }
    if (-not (Test-Path -LiteralPath $Fallback)) { throw "fallback pinentry not found at '$Fallback'" }
    # Every user-scope write broadcasts WM_SETTINGCHANGE, which takes seconds: write only on change
    function Set-UserEnv([string]$Name, [string]$Value) {
      $current = [Environment]::GetEnvironmentVariable($Name, 'User')
      if ("$current" -eq $Value) { return $false }
      [Environment]::SetEnvironmentVariable($Name, $(if ($Value) { $Value } else { $null }), 'User')
      return $true
    }
    if (Set-UserEnv 'CREDENTIAL_STORE_PINENTRY_FALLBACK' $Fallback) { $restart = $true }
    # The agent started below inherits this process's environment, not the registry
    $env:CREDENTIAL_STORE_PINENTRY_FALLBACK = $Fallback

    $conf = Join-Path (Get-GpgDir homedir) 'gpg-agent.conf'
    $wanted = "enable-putty-support`nenable-win32-openssh-support`npinentry-program $pinentryExe`n"
    if ($ExtraConfig) { $wanted += Get-Content -Raw -LiteralPath $ExtraConfig }
    if (-not (Test-Path -LiteralPath $conf) -or (Get-Content -Raw -LiteralPath $conf) -ne $wanted) {
      Set-Content -LiteralPath $conf -Value $wanted -NoNewline
      $restart = $true
    }

    # win-gpg-agent: its agent-gui runs the agent with its own pinentry and serves the OpenSSH pipe
    $run = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
    Remove-ItemProperty -Path $run -Name 'win-gpg-agent' -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path ([Environment]::GetFolderPath('Startup')) 'win-gpg-agent.lnk') -ErrorAction SilentlyContinue
    $agentGui = Get-Process agent-gui -ErrorAction SilentlyContinue
    if ($agentGui) {
      $agentGui | Stop-Process -Force
      $restart = $true
    }
    $stale = 'WIN_AGENT_HOME', 'WIN_GNUPG_HOME', 'WIN_GNUPG_SOCKETS', 'WSL_AGENT_HOME', 'WSL_GNUPG_HOME', 'WSL_GNUPG_SOCKETS'
    foreach ($name in $stale) { Set-UserEnv $name "" | Out-Null }
    $wslenv = [Environment]::GetEnvironmentVariable('WSLENV', 'User')
    if ($wslenv) {
      Set-UserEnv 'WSLENV' (($wslenv -split ':' | Where-Object { ($_ -split '/')[0] -notin $stale }) -join ':') | Out-Null
    }
    Set-UserEnv 'SSH_AUTH_SOCK' '\\.\pipe\openssh-ssh-agent' | Out-Null

    Set-ItemProperty -Path $run -Name 'gpg-agent' -Value "`"$Gpgconf`" --launch gpg-agent"
    if ($restart) { & $Gpgconf --kill gpg-agent }
    & $Gpgconf --launch gpg-agent
  '';

  mkSystemdSocketService = name: let
    sock = cfg.sockets.${name};
  in
    lib.mkIf sock.enable {
      systemd.user.services."win-gpg-agent-${name}" = {
        Unit = {
          Description = "Windows gpg-agent passthrough for ${name} socket";
          After = lib.optional cfg.provision.enable "win-gpg-agent-provision.service";
          Wants = lib.optional cfg.provision.enable "win-gpg-agent-provision.service";
        };

        Install = {
          WantedBy = ["default.target"];
        };

        Service = {
          Environment = "PATH=${lib.makeBinPath [pkgs.socat pkgs.coreutils pkgs.gnused]}";
          ExecStart = pkgs.writeShellScript "win-gpg-agent-${name}" ''
            ${
              if cfg.windowsSocketsPath != null
              then "WINDOWS_SOCKETS_DIR=\"${cfg.windowsSocketsPath}\""
              else "WINDOWS_SOCKETS_DIR=$(${gpgconfDir} socketdir)"
            }

            ${
              if cfg.wslSocketsPath != null
              then "UNIX_SOCKET_BASE_DIR=\"${cfg.wslSocketsPath}\""
              else ''
                UNIX_SOCKET_BASE_DIR="$XDG_RUNTIME_DIR/gnupg"
              ''
            }

            UNIX_SOCKET_PATH="$UNIX_SOCKET_BASE_DIR/${sock.wslRelativePath}"

            mkdir -p "$UNIX_SOCKET_BASE_DIR"
            chmod 0700 -R "$UNIX_SOCKET_BASE_DIR"

            [ -e "$UNIX_SOCKET_PATH" ] && rm "$UNIX_SOCKET_PATH"

            socat UNIX-LISTEN:"\"$UNIX_SOCKET_PATH\"",fork EXEC:"\"\'${cfg.relayPath}\' ${
              if name == "ssh"
              then ""
              else "--gpgConfigBasepath \'$WINDOWS_SOCKETS_DIR\' --gpg \'${sock.windowsRelativePath}\'"
            }\"" 1>/dev/null 2>&1
          '';
          Restart = "always";
        };
      };
    };
in {
  options.tl.services.win-gpg-agent = {
    enable = lib.mkEnableOption "passing the Windows gpg-agent (GnuPG 2.4+) through to WSL";

    gpgconf = lib.mkOption {
      type = lib.types.str;
      example = "C:\\Program Files\\GnuPG\\bin\\gpgconf.exe";
      description = "Windows path to GnuPG's gpgconf.exe.";
    };

    relayPath = lib.mkOption {
      type = lib.types.str;
      description = "wsl2-ssh-pageant.exe location from WSL perspective";
      default = "${pkgs.wsl2-ssh-pageant}/bin/wsl2-ssh-pageant.exe";
      defaultText = lib.literalExpression ''"''${pkgs.wsl2-ssh-pageant}/bin/wsl2-ssh-pageant.exe"'';
    };

    windowsSocketsPath = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      description = "Path of the gpg-agent sockets from Windows perspective";
      example = "C:/Users/truelecter/AppData/Local/gnupg";
      defaultText = "`gpgconf --list-dirs socketdir`";
      default = null;
    };

    wslSocketsPath = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      description = "Path of Unix sockets from WSL perspective";
      defaultText = "value of $XDG_RUNTIME_DIR/gnupg";
      example = "/home/truelecter/.gnupg-sockets";
      default = null;
    };

    provision = {
      enable = lib.mkEnableOption ''
        configuring the Windows gpg-agent from WSL: gpg-agent.conf with pageant and Windows OpenSSH support and
        credential-store-pinentry, autostart at logon, and removing win-gpg-agent's agent-gui'';

      pinentryFallback = lib.mkOption {
        type = lib.types.nullOr lib.types.str;
        default = null;
        example = "C:\\Users\\me\\AppData\\Local\\Programs\\pinentry-for-windows\\pfw.x64.exe";
        description = "Windows path to the pinentry for prompts the credential store does not answer; null is GnuPG's pinentry-basic.exe.";
      };

      extraConfig = lib.mkOption {
        type = lib.types.lines;
        default = "";
        description = "Extra lines for the Windows gpg-agent.conf.";
      };
    };

    sockets = {
      gpg = mkSocketOption "gpg" "gpg-gent socket";
      extra = mkSocketOption "extra" "gpg-agent extra socket";
      ssh = mkSocketOption "ssh" "gpg-agent ssh socket";
    };
  };

  config = lib.mkIf cfg.enable (
    lib.mkMerge [
      {
        assertions = [
          (lib.hm.assertions.assertPlatform "tl.services.win-gpg-agent" pkgs
            lib.platforms.linux)
          # Figure out how to detect if this work on WSL
          # {
          #   assertion = config ? wsl && config.wsl.enable;
          #   message = "wsl must be enabled to use win-gpg-agent passthrough";
          # }
        ];
      }
      (mkSystemdSocketService "ssh")
      (mkSystemdSocketService "extra")
      (mkSystemdSocketService "gpg")
      (lib.mkIf cfg.provision.enable {
        systemd.user.services.win-gpg-agent-provision = {
          Unit.Description = "Configure and start gpg-agent on the Windows host";
          Install.WantedBy = ["default.target"];
          Service = {
            Type = "oneshot";
            RemainAfterExit = true;
            ExecStart = pkgs.writeShellScript "win-gpg-agent-provision" ''
              # Windows tools reject UNC working directories
              cd /mnt/c
              exec ${powershell} -NoProfile -ExecutionPolicy Bypass \
                -File "$(/bin/wslpath -w ${provisionScript})" \
                -Gpgconf ${lib.escapeShellArg cfg.gpgconf} \
                -Pinentry "$(/bin/wslpath -w ${lib.getExe' pkgs.credential-store-pinentry-windows "credential-store-pinentry.exe"})" \
                -Fallback ${lib.escapeShellArg (toString cfg.provision.pinentryFallback)} \
                -ExtraConfig ${
                if cfg.provision.extraConfig == ""
                then "''"
                else "\"$(/bin/wslpath -w ${pkgs.writeText "gpg-agent-extra.conf" cfg.provision.extraConfig})\""
              }
            '';
          };
        };
      })
      (
        lib.mkIf cfg.sockets.ssh.enable {
          programs.zsh.initContent = lib.mkAfter ''
            ${
              if cfg.wslSocketsPath != null
              then "__W_GPG_UNIX_SOCKET_BASE_DIR=\"${cfg.wslSocketsPath}\""
              else ''
                __W_GPG_UNIX_SOCKET_BASE_DIR="$XDG_RUNTIME_DIR/gnupg"
              ''
            }

            export SSH_AUTH_SOCK="$__W_GPG_UNIX_SOCKET_BASE_DIR/${cfg.sockets.ssh.wslRelativePath}"
          '';
        }
      )
    ]
  );
}
