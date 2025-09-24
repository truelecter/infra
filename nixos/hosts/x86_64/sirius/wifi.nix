{
  config,
  pkgs,
  lib,
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
    networks."Xata290.5S" = {
      pskRaw = "ext:WIFI_PASSWORD";
      priority = 100;
    };
    secretsFile = config.sops.secrets.xata-password-env.path;
    extraConfig = ''
      ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=wifi
      country=US
      update_config=1
    '';
  };

  boot.extraModprobeConfig = ''
    options cfg80211 ieee80211_regdom="US"
    options iwlwifi lar_disable=1
    options iwlmvm power_scheme=1
    options rtw88_core disable_lps_deep=Y
  '';

  services.udev.extraRules = ''
    ATTR{idVendor}=="0bda", ATTR{idProduct}=="1a2b", RUN+="${pkgs.usb-modeswitch}/bin/usb_modeswitch -KQ -v 0bda -p 1a2b"
    ACTION=="add", SUBSYSTEM=="net", KERNEL=="wifi*" RUN+="${pkgs.iw}/bin/iw dev %k set power_save off"
  '';

  boot.extraModulePackages = let
    # iwlifi = pkgs.callPackage ./kmod/iwlwifi.nix {inherit (config.boot.kernelPackages) kernel;};
    # iwlifi-larless = iwlifi.overrideAttrs (prev: {
    #   patches = [./kmod/iwlwifi-lar_disable.patch];
    # });
    rtl8821au = config.boot.kernelPackages.rtl8821au.overrideAttrs {
      src = pkgs.fetchFromGitHub {
        owner = "morrownr";
        repo = "8821au-20210708";
        rev = "0b12ea54b7d6dcbfa4ce94eb403b1447565407f1";
        hash = "sha256-tSs5gt+IyRuIOHTH8E9piQInpkKOR+WRKMs1sAmWHpo=";
      };
    };
  in [
    # (lib.hiPrio iwlifi-larless)
    rtl8821au
  ];

  # TOOD: reset via uhubctl

  # ALFA awus036axml bluetooth stack does not work for some reason
  # boot.blacklistedKernelModules = ["btusb" "bluetooth"];
}
