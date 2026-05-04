{
  config,
  lib,
  ...
}:
with lib; let
  cfg = config.tl.services.klipper.minimize-system;
in {
  options.tl.services.klipper.minimize-system = {
    enable = mkEnableOption "Mainsail is the popular web interface for Klipper";
  };

  config = mkIf cfg.enable {
    # imports = [
    #   (modulesPath + "/profiles/minimal.nix")
    # ];
  };
}
