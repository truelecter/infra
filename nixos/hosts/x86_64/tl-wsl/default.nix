{
  inputs,
  suites,
  profiles,
  pkgs,
  lib,
  ...
}: {
  imports =
    suites.wsl
    ++ [
      profiles.common.build-machines

      ./secrets.nix
    ];

  wsl = {
    defaultUser = "truelecter";
    extraBin = let
      e = pkg: bin: {src = lib.getExe' pkg bin;};
      e' = pkg: bins: builtins.map (e pkg) bins;
    in
      lib.flatten [
        (e pkgs.bash "bash")
        (e pkgs.gnugrep "grep")
        (e pkgs.gawk "awk")
        (e pkgs.gnused "sed")
        (e pkgs.gnutar "tar")
        (e pkgs.which "which")
        (e pkgs.curl "curl")
        (e pkgs.wget "wget")
        (e pkgs.ps "ps")
        (e pkgs.gzip "gzip")
        (e' pkgs.coreutils [
          "dirname"
          "readlink"
          "uname"
          "rm"
          "mkdir"
          "mktemp"
          "mv"
          "cp"
          "touch"
          "tail"
          "cat"
          "sleep"
          "ls"
          "chmod"
        ])
      ];
  };

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
}
