{suites, ...}: {
  imports =
    suites.base
    ++ suites._3d-printing
    ++ suites.rpi4
    ++ [
      ./hardware-configuration.nix
      ./camera.nix
      ./klipper
    ];

  printer = {
    name = "Voron 2.4";
    canbus.txQueueLength = 1024;
    klipperScreen = {
      enable = true;
      ledProfiles = {
        Dark = {
          icon = "avatar-default";
          script = "LED_PROFILE_APPLY PROFILE=dark";
        };
        Full.script = "LED_PROFILE_APPLY PROFILE=full";
        Toolhead = {
          icon = "extruder";
          script = "LED_PROFILE_APPLY PROFILE=toolhead";
        };
      };
    };
  };

  system.stateVersion = "23.05";

  users.users.truelecter = {
    extraGroups = ["video" "gpio"];
  };
}
