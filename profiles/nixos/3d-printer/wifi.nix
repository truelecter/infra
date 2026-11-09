{
  config,
  pkgs,
  lib,
  ...
}: let
  cfg = config.printer.wifi;
in {
  config = lib.mkIf cfg.enable (lib.mkMerge [
    {
      users.groups.wifi.members = ["klipper-screen" "truelecter"];

      networking.wireless = {
        enable = true;
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

      boot.extraModprobeConfig = ''
        options cfg80211 ieee80211_regdom="UA"
        options brcmfmac feature_disable=0x200000
      '';
    }

    (lib.mkIf cfg.cm4ExternalAntenna {
      hardware = {
        deviceTree.overlays = [
          # Equivalent to dtparam=ant2
          {
            name = "choose-antenna";
            dtsText = ''
              /dts-v1/;
              /plugin/;
              / {
                compatible = "brcm,bcm2711";
                fragment@0 {
                  // Despite this being ant1 instead of ant2,
                  // CM4 will use external antenna. This is because
                  // ant1 is enabled by default and switching
                  // GPIO pins causes it to activate external antenna
                  target = <&ant1>;
                  __overlay__ {
                    gpios = <7 0>;
                  };
                };
                fragment@1 {
                  target = <&ant2>;
                  __overlay__ {
                    // output-low is still present here
                    gpios = <3 0>;
                  };
                };
              };
            '';
          }
        ];
        enableRedistributableFirmware = lib.mkForce false;
        firmware = [pkgs.raspberrypiWirelessFirmware];
      };
    })
  ]);
}
