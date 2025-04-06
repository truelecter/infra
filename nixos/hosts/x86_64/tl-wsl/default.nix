{
  inputs,
  suites,
  profiles,
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
