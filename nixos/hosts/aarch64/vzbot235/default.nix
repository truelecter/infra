{suites, ...}: {
  imports =
    suites.base
    ++ suites._3d-printing
    ++ suites.rpi4
    ++ [
      ./camera.nix
      ./hardware-configuration.nix
      ./klipper
    ];

  printer = {
    name = "VzBot 235";
    canbus.txQueueLength = 256;
    klipperScreen = {
      enable = true;
      ledProfiles = {
        Dark = {
          icon = "avatar-default";
          script = "LED_NONE";
        };
        Full.script = "LED_FULL";
      };
    };
  };

  system.stateVersion = "24.11";

  users.users.truelecter = {
    extraGroups = ["video" "gpio"];
  };
}
