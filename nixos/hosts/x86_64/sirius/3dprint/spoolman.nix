{
  config,
  pkgs,
  lib,
  ...
}: let
  spoolmanCfg = config.tl.services.spoolman;
in {
  tl.services.spoolman = {
    enable = true;
    host = "0.0.0.0";
  };
}
