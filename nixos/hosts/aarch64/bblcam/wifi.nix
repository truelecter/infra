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
      options brcmfmac roamoff=1 feature_disable=0x282000S
    '';
  };
}
