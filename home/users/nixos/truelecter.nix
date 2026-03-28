{hmSuites, ...}: {
  imports = [
    ./truelecter-micro.nix
  ];

  home-manager.users.truelecter = {
    imports = hmSuites.base ++ hmSuites.git;
  };
}
