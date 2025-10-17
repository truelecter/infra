{
  lib,
  pkgs,
  ...
}: {
  #region nix options
  nix = {
    settings = {
      # Improve nix store disk usage
      auto-optimise-store = true;
      trusted-users = ["@wheel"];

      # This is just a representation of the nix default
      system-features = lib.mkDefault ["nixos-test" "benchmark" "big-parallel" "kvm"];
    };

    optimise.automatic = true;
  };
  #endregion

  programs.zsh.enable = true;
  users.defaultUserShell = pkgs.zsh;

  system = {
    disableInstallerTools = true;
    tools = {
      nixos-rebuild.enable = true;
      nixos-enter.enable = true;
      nixos-version.enable = true;
    };
  };

  environment = {
    # Selection of sysadmin tools that can come in handy
    systemPackages = with pkgs; [
      # gptfdisk
      iputils
      usbutils
      util-linux
      pciutils
      ncdu
    ];
  };

  #region Common system defaults
  time.timeZone = "Europe/Kiev";

  users.mutableUsers = lib.mkDefault false;
  security.sudo.enable = lib.mkForce true;
  security.sudo.wheelNeedsPassword = lib.mkForce false;

  console = {
    earlySetup = true;
    font = "${pkgs.terminus_font}/share/consolefonts/ter-u16n.psf.gz";
  };

  i18n.defaultLocale = "en_US.UTF-8";
  #endregion

  services.openssh = {
    enable = lib.mkDefault true;

    settings = {
      # Use only public keys
      PasswordAuthentication = lib.mkForce false;
      KbdInteractiveAuthentication = lib.mkForce false;

      # root login is never welcome, except for remote builders
      PermitRootLogin = lib.mkForce "prohibit-password";
    };

    startWhenNeeded = lib.mkDefault true;
    openFirewall = lib.mkDefault false;
    hostKeys = [
      {
        type = "rsa";
        bits = 4096;
        path = "/etc/ssh/ssh_host_rsa_key";
      }
      {
        path = "/etc/ssh/ssh_host_ed25519_key";
        type = "ed25519";
      }
    ];
  };

  programs.ssh.extraConfig = ''
    Include /etc/ssh/ssh_config.d/*
  '';

  # Service that makes Out of Memory Killer more effective
  services.earlyoom.enable = true;

  # Disable by default (why is it enabled even lol)
  services.speechd.enable = lib.mkOverride 999 false;

  catppuccin = {
    flavor = "mocha";
    enable = true;
  };
}
