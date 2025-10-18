{
  config,
  pkgs,
  lib,
  ...
}: {
  users.groups.wifi.members = ["truelecter"];

  networking.wireless = {
    enable = true;
    interfaces = ["wlan0"];

    networks = {
      # "Xata290.5S" = {
      #   pskRaw = "ext:WIFI_PASSWORD";
      #   priority = 10;
      # };

      "Xata290.2" = {
        pskRaw = "ext:WIFI_PASSWORD";
        priority = 5;
        authProtocols = ["WPA-PSK-SHA256"];
      };
    };

    driver = "nl80211";

    secretsFile = config.sops.secrets.xata-password-env.path;
    extraConfig = ''
      ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=wifi
      country=UA
      update_config=1
    '';
  };

  hardware = {
    enableRedistributableFirmware = lib.mkForce false;
    firmware = [pkgs.raspberrypiWirelessFirmware];
  };

  boot = {
    extraModprobeConfig = ''
      options cfg80211 ieee80211_regdom="UA"
      options brcmfmac feature_disable=0x200000
    '';
  };
}
