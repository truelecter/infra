{pkgs, ...}: {
  services.unifi = {
    enable = true;
    openFirewall = true;
    mongodbPackage = pkgs.mongodb-ce;
  };
}
