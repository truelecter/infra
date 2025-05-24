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

  mkSystemdSocketService = name: let
    sock = cfg.sockets.${name};
  in
    lib.mkIf sock.enable {
      systemd.user.services."win-gpg-agent-${name}" = {
        Unit = {
          Description = "Windows gpg-agent passthrough for ${name} socket";
        };

        Install = {
          WantedBy = ["default.target"];
        };

        Service = {
          Environment = "PATH=${pkgs.wslu}/bin:${pkgs.socat}/bin:${pkgs.coreutils}/bin";
          ExecStart = pkgs.writeShellScript "win-gpg-agent-${name}" ''
            getWinEnv() {
              # TODO this should be configurable
              /mnt/c/Windows/system32/cmd.exe /c "echo %$1%" 2> /dev/null
            }

            getWinEnvWSLPath() {
              /bin/wslpath -au "$(/mnt/c/Windows/system32/cmd.exe /c 'echo %$1%' 2> /dev/null)" 2> /dev/null
            }

            ${
              if cfg.windowsSocketsPath != null
              then "WINGPGAGENT_SOCKETS_DIR=\"${cfg.windowsSocketsPath}\""
              else ''
                WINGPGAGENT_SOCKETS_DIR=`getWinEnv WIN_GNUPG_SOCKETS`
              ''
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
              else "--gpgConfigBasepath \'$WINGPGAGENT_SOCKETS_DIR\' --gpg \'${sock.windowsRelativePath}\'"
            }\"" 1>/dev/null 2>&1
          '';
          Restart = "always";
        };
      };
    };
in {
  options.tl.services.win-gpg-agent = {
    enable = lib.mkEnableOption "Enable win-gpg-agent integration";

    relayPath = lib.mkOption {
      type = lib.types.str;
      description = "sorelay.exe location from WSL perspective";
      example = "/mnt/C/Users/truelecter/scoop/apps/win-gpg-agent/current/sorelay.exe";
    };

    windowsSocketsPath = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      description = "Path of win-gpg-agent sockets from Windows perspective";
      example = "C:/Users/truelecter/AppData/Local/gnupg/agent-gui";
      defaultText = "value of $WIN_GNUPG_SOCKETS";
      default = null;
    };

    wslSocketsPath = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      description = "Path of Unix sockets from WSL perspective";
      defaultText = "value of $XDG_RUNTIME_DIR/gnupg";
      example = "/home/truelecter/.gnupg-sockets";
      default = null;
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
