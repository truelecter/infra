{
  config,
  pkgs,
  lib,
  ...
}: let
  klipperCfg = config.services.klipper;
  moonrakerCfg = config.services.moonraker;
  gcodePath = "${moonrakerCfg.stateDir}/gcodes";
  rpiFirmware =
    (pkgs.klipper-firmware.override {
      mcu = "rpi";
      firmwareConfig = ./firmwares/klipper-rpi-4;
    })
    .overrideAttrs (_: {
      patches = [
        ./firmwares/rpi-fw.patch
      ];

      preBuild = ''
        NIX_CFLAGS_COMPILE="-DNIXOS_GPIO_H_INCLUDE_PATH=\"${pkgs.linuxHeaders}/include/linux/gpio.h\" $NIX_CFLAGS_COMPILE"
        NIX_CFLAGS_COMPILE="-DNIXOS_SCHED_H_INCLUDE_PATH=\"${pkgs.linuxHeaders}/include/linux/sched.h\" $NIX_CFLAGS_COMPILE"
        NIX_CFLAGS_COMPILE="-DNIXOS_SCHED_TYPES_H_INCLUDE_PATH=\"${pkgs.linuxHeaders}/include/linux/sched/types.h\" $NIX_CFLAGS_COMPILE"
      '';

      installPhase = ''
        mkdir -p $out
        cp -r out/klipper.elf $out
      '';
    });
in {
  boot.kernelModules = ["gpiod"];

  environment.etc = builtins.listToAttrs (
    map (
      p: {
        name = "klipper/${lib.path.removePrefix ./configs/klipper.d p}";
        value = {
          inherit (klipperCfg) user group;

          source = p;
        };
      }
    )
    (lib.filesystem.listFilesRecursive ./configs/klipper.d)
  );

  services.klipper = {
    enable = true;

    package = pkgs.kalico-full-plugins;

    extraConfigurationPackages = [
      pkgs.kamp
    ];

    settings = {
      "include /etc/klipper/main.cfg" = {};

      "shaketune" = {
        result_folder = "${klipperCfg.configDir}/klippain-results";
      };

      virtual_sdcard = {
        path = gcodePath;
      };
    };

    host-mcu = {
      enable = false;
      firmware-package = rpiFirmware;
    };

    firmwares = {
      ebb36 = {
        enable = true;
        enableKlipperFlash = true;
        configFile = ./firmwares/klipper-ebb36;
        section = "mcu toolhead";
        # mcu.canbus_uuid = "13ddde1f7caf";
        mcu.canbus_uuid = "735b8005ab2b";
      };

      manta-v2 = {
        enable = true;
        enableKlipperFlash = true;
        configFile = ./firmwares/klipper-manta-v2;
        section = "mcu back";
        mcu.canbus_uuid = "a04615c85abf";
      };

      # The hotkey board; not connected (see danger.cfg.disabled).
      buttons = {
        enable = true;
        configFile = ./firmwares/klipper-buttons;
        section = "mcu hotkey";
        # mcu = {
        #   serial = "/dev/serial/by-id/usb-Klipper_rp2040_E6625C4893826B33-if00";
        #   is_non_critical = true;
        # };
      };

      stealthmax = {
        enable = true;
        enableKlipperFlash = true;
        configFile = ./firmwares/klipper-stealthmax;
        section = "mcu SM";
        mcu.canbus_uuid = "87b7ace7855f";
      };

      octopus = {
        enable = true;
        enableKlipperFlash = true;
        configFile = ./firmwares/klipper-octopus-pro;
        section = "mcu";
        mcu.serial = "/dev/serial/by-id/usb-Klipper_stm32h723xx_20003A000951313339373836-if00";
        # mcu.canbus_uuid = "42545159bd5a";
      };

      # Runs Cartographer's own firmware.
      cartographer.mcu.canbus_uuid = "d5d27f831859";
    };

    katapult = {
      manta-v2 = {
        enable = true;
        configFile = ./firmwares/katapult-manta-v2;
      };

      ebb36 = {
        enable = true;
        configFile = ./firmwares/katapult-ebb36;
      };

      buttons = {
        enable = true;
        configFile = ./firmwares/katapult-buttons;
      };

      stealthmax = {
        enable = true;
        configFile = ./firmwares/katapult-stealthmax;
      };

      octopus = {
        enable = true;
        configFile = ./firmwares/katapult-octopus-pro;
      };
    };
  };

  systemd = {
    settings.Manager = {
      CPUAffinity = "0-1";
    };

    services.klipper.serviceConfig.CPUAffinity = "2-3";
    tmpfiles.rules = [
      "d ${gcodePath} 775 klipper klipper"
    ];
  };

  environment.systemPackages = [pkgs.katapult-flashtool];

  services.mainsail = {
    enable = true;
    nginx.extraConfig = ''
      client_max_body_size 0;
    '';
  };
}
