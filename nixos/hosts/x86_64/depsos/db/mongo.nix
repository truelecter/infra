{pkgs, ...}: {
  services.mongodb = {
    enable = false;
    bind_ip = "0.0.0.0";
    dbpath = "/srv/db/mongo";
  };
}
