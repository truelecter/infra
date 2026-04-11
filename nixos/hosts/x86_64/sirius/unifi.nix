{pkgs, ...}: {
  nixpkgs.config.permittedInsecurePackages = [
    "unifi-controller-9.5.21"
  ];

  services.unifi = {
    enable = true;
    openFirewall = true;
    mongodbPackage = pkgs.mongodb-7_0;
  };
}
