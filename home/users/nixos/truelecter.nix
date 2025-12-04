{
  pkgs,
  hmSuites,
  sshKeys,
  ...
}: {
  home-manager.users.truelecter = {
    imports = hmSuites.base ++ hmSuites.git;

    home.stateVersion = "22.11";
  };

  programs.zsh.enable = true;

  users.users.truelecter = {
    isNormalUser = true;
    shell = pkgs.zsh;
    extraGroups = ["wheel" "docker"];

    openssh.authorizedKeys.keys = sshKeys;
  };
}
