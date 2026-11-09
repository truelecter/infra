{pkgs, ...}: {
  hardware.deviceTree = {
    overlays = let
      overlay = name: {
        inherit name;
        dtboFile = "${pkgs.device-tree_rpi.overlays}/${name}.dtbo";
      };
    in [
      # (overlay "disable-bt")
      (overlay "vc4-kms-v3d-pi4")
      (overlay "vc4-kms-dsi-7inch")
      # (overlay "rpi-ft5406")
    ];
  };

  hardware.raspberry-pi."4" = {
    i2c0 = {
      enable = true;
      frequency = 50000;
    };
  };
}
