{
  config,
  lib,
  pkgs,
  inputs,
  ...
}: let
  wifiInterface = "wifi-ext";

  # The mt7927 module installs under extra/mt76 and extra/bluetooth.
  # buildEnv turns each of those into one directory symlink, and depmod
  # does not walk those, so the in-tree mt7925e (no 14c3:7927 alias) is
  # what gets loaded. Flatten every .ko into updates/ as a file symlink.
  # depmod searches updates/ before kernel/, so this outranks the in-tree module.
  # https://github.com/cmspam/mt7927-nixos/issues/5
  mt7927Prio = let
    upstream = inputs.mt7927.nixosModules.default {inherit config lib pkgs;};
    moduleConfig =
      if (upstream.config._type or "") == "if"
      then upstream.config.content
      else upstream.config;
  in
    map (
      pkg:
        lib.hiPrio (pkgs.runCommand "mt7927-prio-${pkg.pname or pkg.name}" {modules = pkg;} ''
          ver=$(cd "$modules/lib/modules" && ls -d *)
          dest="$out/lib/modules/$ver/updates"
          mkdir -p "$dest"
          find "$modules/lib/modules/$ver" \( -name '*.ko' -o -name '*.ko.xz' \) -exec \
            sh -c 'ln -s "$1" "$2/$(basename "$1")"' _ {} "$dest" \;
        '')
    )
    moduleConfig.boot.extraModulePackages;
in {
  users.groups.wpa_supplicant.members = ["truelecter"];

  networking.wireless = {
    enable = true;
    interfaces = [wifiInterface];

    networks = {
      "Xata290" = {
        pskRaw = "ext:WIFI_PASSWORD";
        priority = 5;
      };
      "Xata290.5" = {
        pskRaw = "ext:WIFI_PASSWORD";
        priority = 10;
      };
      "Xata290.5S" = {
        pskRaw = "ext:WIFI_PASSWORD";
        priority = 100;
      };
    };

    secretsFile = config.sops.secrets.xata-password-env.path;

    extraConfig = ''
      country=UA
      update_config=1
    '';

    userControlled = true;
  };

  hardware.mediatek-mt7927 = {
    enable = true;
    enableWifi = true;
    enableBluetooth = true;
    # Highly recommended to fix upload speed issues
    disableAspm = true;
  };

  # Outranks the June 2025 blobs shipped by hardware.mediatek-mt7927.
  hardware.firmware = [
    (lib.hiPrio (pkgs.callPackage ./mt7927-firmware.nix {}))
  ];

  boot.extraModprobeConfig = ''
    options cfg80211 ieee80211_regdom="US"
    options iwlwifi lar_disable=1
    options iwlmvm power_scheme=1
    options rtw88_core disable_lps_deep=Y
    options mt76_usb disable_usb_sg=1
  '';

  services.udev.extraRules = ''
    ATTR{idVendor}=="0bda", ATTR{idProduct}=="1a2b", RUN+="${pkgs.usb-modeswitch}/bin/usb_modeswitch -KQ -v 0bda -p 1a2b"
    ACTION=="add", SUBSYSTEM=="net", KERNEL=="wifi*" RUN+="${pkgs.iw}/bin/iw dev %k set power_save off"
    ACTION=="add", SUBSYSTEM=="net", KERNEL=="wlan*" RUN+="${pkgs.iw}/bin/iw dev %k set power_save off"
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
  in
    [
      # (lib.hiPrio iwlifi-larless)
      # rtl8821au
    ]
    ++ mt7927Prio;

  # TOOD: reset via uhubctl

  # ALFA awus036axml bluetooth stack does not work for some reason
  # boot.blacklistedKernelModules = ["btusb" "bluetooth"];
}
