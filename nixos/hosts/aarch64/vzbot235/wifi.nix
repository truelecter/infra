{config, ...}: {
  users.groups.wifi.members = ["klipper-screen" "truelecter"];

  networking.wireless = {
    enable = false;
    interfaces = ["wlan0"];

    networks = {
      "Xata290.5" = {
        pskRaw = "ext:WIFI_PASSWORD";
        priority = 10;
      };

      "Xata290" = {
        pskRaw = "ext:WIFI_PASSWORD";
        priority = 5;
      };
    };

    secretsFile = config.sops.secrets.xata-password-env.path;
    extraConfig = ''
      ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=wifi
      country=US
      update_config=1
    '';
  };

  boot = {
    extraModprobeConfig = ''
      options cfg80211 ieee80211_regdom="UA"
      options brcmfmac feature_disable=0x200000
    '';
  };
}
