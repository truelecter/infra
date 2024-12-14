{
  config,
  pkgs,
  ...
}: let
  wifiInterface = "wifi-ext";
in {
  users.groups.wifi.members = ["truelecter"];

  networking.wireless = {
    enable = true;
    interfaces = [wifiInterface];
    networks."Xata290" = {
      pskRaw = "ext:WIFI_PASSWORD";
      priority = 5;
    };
    networks."Xata290.5" = {
      pskRaw = "ext:WIFI_PASSWORD";
      priority = 10;
    };
    secretsFile = config.sops.secrets.xata-password-env.path;
    extraConfig = ''
      ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=wifi
      country=UA
      update_config=1
    '';
  };

  services.udev.extraRules = ''
    ATTR{idVendor}=="0bda", ATTR{idProduct}=="1a2b", RUN+="${pkgs.usb-modeswitch}/bin/usb_modeswitch -KQ -v 0bda -p 1a2b"
  '';

  boot.extraModulePackages = with config.boot.kernelPackages; [
    rtl8852au
  ];
}