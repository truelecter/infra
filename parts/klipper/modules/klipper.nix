{
  config,
  lib,
  pkgs,
  ...
}: let
  l = builtins // lib;

  inherit (l) mkEnableOption types mkOption;

  cfg = config.tl.services.klipper;

  format = pkgs.formats.ini {
    # https://github.com/NixOS/nixpkgs/pull/121613#issuecomment-885241996
    listToValue = list:
      if builtins.length list == 1
      then l.generators.mkValueStringDefault {} (l.head list)
      else l.concatMapStrings (s: "\n  ${l.generators.mkValueStringDefault {} s}") list;
    mkKeyValue = l.generators.mkKeyValueDefault {} ": ";
  };
in {
  ##### interface
  options = {
    tl.services.klipper = {
      enable = mkEnableOption (lib.mdDoc "Klipper, the 3D printer firmware");

      package = mkOption {
        type = types.package;
        default = pkgs.klipper;
        defaultText = l.literalExpression "pkgs.klipper";
        description = l.mdDoc "The Klipper package.";
      };

      firmware-package = mkOption {
        type = types.package;
        default = pkgs.klipper-firmware;
        defaultText = l.literalExpression "pkgs.klipper-firmware";
        description = l.mdDoc "The Klipper firmware package for overriding.";
      };

      extraConfigurationPackages = mkOption {
        type = types.listOf types.package;
        default = [];
        defaultText = l.literalExpression "[]";
        description = l.mdDoc ''
          List of packages, that contains configurations (such as KAMP).
          Configurations will be linked to `/etc/klipper/plugins/$${pluginPackageName}`.
        '';
      };

      logFile = mkOption {
        type = types.nullOr types.path;
        default = null;
        example = "/var/lib/klipper/klipper.log";
        description = l.mdDoc ''
          Path of the file Klipper should log to.
          If `null`, it logs to stdout, which is not recommended by upstream.
        '';
      };

      stateDirectory = mkOption {
        type = types.path;
        default = "/var/lib/klipper";
        description = l.mdDoc ''
          Klipper state files (like gcodes). Also serves as the home for the user.
        '';
      };

      inputTTY = mkOption {
        type = types.path;
        default = "/run/klipper/tty";
        description = l.mdDoc "Path of the virtual printer symlink to create.";
      };

      apiSocket = mkOption {
        type = types.nullOr types.path;
        default = "/run/klipper/api";
        description = l.mdDoc "Path of the API socket to create.";
      };

      configFile = mkOption {
        type = types.nullOr types.path;
        default = null;
        description = "Path to main Klipper config.";
      };

      user = mkOption {
        type = types.str;
        default = "klipper";
        description = "User account under which Klipper runs.";
      };

      group = mkOption {
        type = types.str;
        default = "klipper";
        description = "Group account under which Klipper runs.";
      };

      settings = mkOption {
        type = types.nullOr format.type;
        default = null;
        description = l.mdDoc ''
          Configuration for Klipper. See the [documentation](https://www.klipper3d.org/Overview.html#configuration-and-tuning-guides)
          for supported values.
        '';
      };

      firmwares = mkOption {
        description = l.mdDoc "Firmwares klipper should manage";
        default = {};
        type =
          types.attrsOf
          (
            types.submodule {
              options = {
                enable = mkEnableOption (lib.mdDoc ''
                  building of firmware for manual flashing.
                '');

                configFile = mkOption {
                  type = types.path;
                  description = lib.mdDoc "Path to firmware config which is generated using `klipper-genconf`";
                };

                # flashing = {
                #   enable = mkEnableOption (lib.mdDoc ''
                #     Building of firmware for manual flashing with Katapult
                #   '');

                #   can = {
                #     interface = mkOption {
                #       type = types.string;
                #       description = lib.mdDoc "CAN interface where this device is located";
                #     };

                #     uuid = mkOption {
                #       type = types.string;
                #       description = lib.mdDoc "CAN device UUID";
                #     };
                #   };

                #   serial = {
                #   };
                # };
              };
            }
          );
      };

      katapult = mkOption {
        description = l.mdDoc "Katapult firmwares";
        default = {};
        type =
          types.attrsOf
          (
            types.submodule {
              options = {
                enable = mkEnableOption (lib.mdDoc ''
                  Enable building of firmware for manual flashing.
                '');

                configFile = mkOption {
                  type = types.path;
                  description = lib.mdDoc "Path to firmware config which is generated using `klipper-genconf`";
                };

                # flashing = {
                #   enable = mkEnableOption (lib.mdDoc ''
                #     Building of firmware for manual flashing with Katapult
                #   '');

                #   can = {
                #     interface = mkOption {
                #       type = types.string;
                #       description = lib.mdDoc "CAN interface where this device is located";
                #     };

                #     uuid = mkOption {
                #       type = types.string;
                #       description = lib.mdDoc "CAN device UUID";
                #     };
                #   };

                #   serial = {
                #   };
                # };
              };
            }
          );
      };

      host-mcu = {
        enable = mkEnableOption "Use host as additional MCU for Klipper";

        firmware-package = mkOption {
          type = types.nullOr types.package;
          default = null;
          description = lib.mdDoc "The klipper-firmware package. Override `pkgs.klipper-firmware` with own config";
        };

        realtime = mkOption {
          type = types.bool;
          default = false;
          description = lib.mdDoc ''
            Set realtime scheduller priority (like -r flag)
          '';
        };

        watchdog = mkOption {
          type = types.bool;
          default = false;
          description = lib.mdDoc ''
            -w klipper-mcu flag
          '';
        };

        serial = mkOption {
          type = types.str;
          default = "/run/klipper/host-mcu";
          description = l.mdDoc ''
            Serial file location
          '';
        };
      };
    };
  };

  ##### implementation
  config = l.mkIf cfg.enable {
    assertions = [
      {
        assertion = cfg.user != null -> cfg.group != null;
        message = "Option services.klipper.group is not set when services.klipper.user is specified.";
      }
      {
        assertion = (cfg.configFile != null) != (cfg.settings != null);
        message = "You need to either specify services.klipper.settings or services.klipper.configFile.";
      }
      {
        assertion = cfg.host-mcu.enable -> cfg.host-mcu.firmware-package != null;
        message = "Option firmware-package is required for host-mcu to work.";
      }
    ];

    environment.etc = let
      pluginsWithConfig = l.filter (p: p ? klipper && p.klipper.config) (cfg.package.plugins ++ cfg.extraConfigurationPackages);

      enabledFirmwares = l.filterAttrs (n: v: v.enable) cfg.firmwares;
      enabledFirmwarePackages =
        l.mapAttrs' (
          name: fcfg:
            l.nameValuePair
            (l.strings.sanitizeDerivationName name)
            (
              cfg.firmware-package.override
              {
                mcu = l.strings.sanitizeDerivationName name;
                firmwareConfig = fcfg.configFile;
              }
            )
        )
        enabledFirmwares;

      enabledKatapultFirmwares = l.filterAttrs (n: v: v.enable) cfg.katapult;
      enabledKatapultFirmwarePackages =
        l.mapAttrs' (
          name: fcfg:
            l.nameValuePair
            (l.strings.sanitizeDerivationName name)
            (
              pkgs.katapult-firmware.override
              {
                mcu = l.strings.sanitizeDerivationName name;
                firmwareConfig = fcfg.configFile;
              }
            )
        )
        enabledKatapultFirmwares;
    in
      (
        l.listToAttrs (
          l.map (p: l.nameValuePair "klipper/plugins/${p.pname}" {source = "${p}/lib/config";}) pluginsWithConfig
        )
      )
      // (
        l.mapAttrs' (k: v: l.nameValuePair "klipper/firmwares/${k}" {source = v;}) enabledFirmwarePackages
      )
      // (
        l.mapAttrs' (k: v: l.nameValuePair "klipper/katapult-firmwares/${k}" {source = v;}) enabledKatapultFirmwarePackages
      );

    systemd.services.klipper = let
      klippyArgs =
        "--input-tty=${cfg.inputTTY}"
        + l.optionalString (cfg.apiSocket != null) " --api-server=${cfg.apiSocket}"
        + l.optionalString (cfg.logFile != null) " --logfile=${cfg.logFile}";

      printerConfigPath = "${cfg.stateDirectory}/printer.cfg";

      printerConfig =
        if cfg.settings != null
        then format.generate "klipper.cfg" cfg.settings
        else cfg.configFile;
    in {
      description = "Klipper 3D Printer Firmware";
      wantedBy = ["multi-user.target"];
      after = ["network.target"];
      preStart = ''
        mkdir -p ${cfg.stateDirectory}
        pushd ${cfg.stateDirectory}
        if [ -e printer.cfg ]; then
          # Backup existing config using the same date format klipper uses for SAVE_CONFIG
          old_config="printer-$(date +"%Y%m%d_%H%M%S").cfg"
          mv printer.cfg "$old_config"
          # Preserve SAVE_CONFIG section from the existing config
          cat ${printerConfig} <(printf "\n") <(sed -n '/#*# <---------------------- SAVE_CONFIG ---------------------->/,$p' "$old_config") > printer.cfg
          ${pkgs.diffutils}/bin/cmp printer.cfg "$old_config" && rm "$old_config"
        else
          cat ${printerConfig} > printer.cfg
        fi
        popd
      '';

      restartTriggers = [printerConfig];

      serviceConfig = {
        ExecStart = "${cfg.package}/bin/klippy ${klippyArgs} ${printerConfigPath}";
        RuntimeDirectory = "klipper";
        StateDirectory = cfg.stateDirectory;
        WorkingDirectory = "${cfg.package}/lib";
        Group = cfg.group;
        User = cfg.user;
        SupplementaryGroups = ["dialout"];

        OOMScoreAdjust = "-999";
        CPUSchedulingPolicy = "rr";
        CPUSchedulingPriority = 99;
        IOSchedulingClass = "realtime";
        IOSchedulingPriority = 0;
        UMask = "0002";
        Environment = [
          "KLIPPER_DIR=${cfg.package}/lib"
        ];
      };
    };

    # Based on https://github.com/Klipper3d/klipper/blob/7290c14531211d027b430f36db5645ce496be900/scripts/klipper-mcu-start.sh
    systemd.services.klipper-mcu = l.mkIf cfg.host-mcu.enable {
      description = "Starts the MCU for Klipper.";

      # We want to it before klipper starts, as usually MCU socket is used in klipper
      before = ["klipper.service"];
      wantedBy = ["multi-user.target"];

      serviceConfig =
        {
          ExecStart = "${cfg.host-mcu.firmware-package}/klipper.elf -I ${cfg.host-mcu.serial}${
            if cfg.host-mcu.watchdog
            then " -w"
            else ""
          }";
          # SupplementaryGroups = "tty";
          Group = cfg.group;
          User = cfg.user;
        }
        // l.optionalAttrs cfg.host-mcu.realtime {
          # https://github.com/Klipper3d/klipper/blob/master/src/linux/main.c#L25
          CPUSchedulingPolicy = "fifo";
          CPUSchedulingPriority = 44;
        };
    };

    users = {
      users.${cfg.user} = {
        isSystemUser = true;
        extraGroups = ["dialout"];
        inherit (cfg) group;
        createHome = true;
        home = l.mkDefault cfg.stateDirectory;
        homeMode = "755";
      };
      groups.${cfg.group} = {};
    };

    # environment.systemPackages = [pkgs.klipper-genconf];

    # environment.systemPackages = with pkgs; let
    #   default = a: b:
    #     if a != null
    #     then a
    #     else b;
    #   firmwares = filterAttrs (n: v: v != null) (mapAttrs
    #     (mcu: {
    #       enable,
    #       enableKlipperFlash,
    #       configFile,
    #       serial,
    #     }:
    #       if enable
    #       then
    #         pkgs.klipper-firmware.override
    #         {
    #           mcu = lib.strings.sanitizeDerivationName mcu;
    #           firmwareConfig = configFile;
    #         }
    #       else null)
    #     cfg.firmwares);
    #   firmwareFlasher =
    #     mapAttrsToList
    #     (mcu: firmware:
    #       pkgs.klipper-flash.override {
    #         mcu = lib.strings.sanitizeDerivationName mcu;
    #         klipper-firmware = firmware;
    #         flashDevice = default cfg.firmwares."${mcu}".serial cfg.settings."${mcu}".serial;
    #         firmwareConfig = cfg.firmwares."${mcu}".configFile;
    #       })
    #     (filterAttrs (mcu: firmware: cfg.firmwares."${mcu}".enableKlipperFlash) firmwares);
    # in
    #   [klipper-genconf] ++ firmwareFlasher ++ attrValues firmwares;
  };
}
