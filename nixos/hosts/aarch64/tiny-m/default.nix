{suites, ...}: {
  imports =
    suites.base
    ++ suites.klipper-printer
    ++ suites.cm4
    ++ [
      ./hardware-configuration.nix
      ./klipper
      ./network.nix
    ];

  printer = {
    name = "Tiny-M";
    wifi.cm4ExternalAntenna = true;
  };

  networking.wireless.networks."Xata290.5S" = {
    pskRaw = "ext:WIFI_PASSWORD";
    priority = 100;
  };

  system.stateVersion = "24.11";

  users.users.truelecter = {
    extraGroups = ["video" "gpio"];
  };
}
