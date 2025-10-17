{
  inputs,
  suites,
  profiles,
  pkgs,
  lib,
  config,
  ...
}: {
  imports =
    suites.wsl
    ++ [
      profiles.common.build-machines

      ./secrets.nix
      ./bluetooth.nix
    ];

  wsl = {
    defaultUser = "truelecter";
    wrapBinSh = true;

    extraBin = let
      bashWrapper = with pkgs;
        runCommand "nixos-wsl-bash-wrapper"
        {
          nativeBuildInputs = [makeWrapper];
        } ''
          makeWrapper ${bashInteractive}/bin/bash $out/bin/bash \
            --prefix PATH ':' ${lib.makeBinPath [systemd gnugrep coreutils gnutar gzip getconf gnused procps which gawk wget curl util-linux]}
        '';
    in [
      {
        name = "bash";
        src = "${bashWrapper}/bin/bash";
      }
    ];
  };

  programs.nix-ld.enable = true;

  system.stateVersion = "22.11";

  services.openssh.enable = true;

  home-manager.users.truelecter = {
    imports = [
      inputs.nixos-vscode-server.homeModules.default
      ({hmSuites, ...}: {imports = hmSuites.develop;})
    ];
    services.vscode-server = {
      enable = true;
      installPath = ["$HOME/.vscode-server" "$HOME/.cursor-server"];
      nodejsPackage = pkgs.nodejs_22;
      # enableFHS = true;
    };

    tl.services.win-gpg-agent = {
      enable = true;
      # sockets.ssh.assuan = true;
      sockets = {
        gpg.enable = false;
        extra.wslRelativePath = "S.gpg-agent";
      };
      relayPath = "/mnt/d/Soft/wsl2-ssh-bridge.exe";
      windowsSocketsPath = "D:/Soft/Scoop/user/apps/gnupg/current/gnupg";
    };
  };

  boot.binfmt.emulatedSystems = ["aarch64-linux"];
}
