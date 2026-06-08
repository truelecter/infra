{
  config,
  lib,
  pkgs,
  ...
}: let
  cfg = config.tl.services.klipper-screen;
  format = pkgs.formats.ini {
    # https://github.com/NixOS/nixpkgs/pull/121613#issuecomment-885241996
    listToValue = l:
      if builtins.length l == 1
      then lib.generators.mkValueStringDefault {} (lib.head l)
      else lib.concatMapStrings (s: "\n  ${lib.generators.mkValueStringDefault {} s}") l;
    mkKeyValue = lib.generators.mkKeyValueDefault {} ":";
  };

  inherit (lib) mkEnableOption mkOption types;
in {
  options.tl.services.klipper-screen = {
    enable = mkEnableOption "KlipperScreen, the touchscreen GUI that interfaces with Klipper via Moonraker";

    package = mkOption {
      type = types.package;
      default = pkgs.klipper-screen;
      defaultText = lib.literalExpression "pkgs.klipper-screen";
      description = lib.mdDoc "The KlipperScreen package.";
    };

    user = mkOption {
      type = types.str;
      default = "klipper-screen";
      description = lib.mdDoc ''
        User account under which KlipperScreen runs.
      '';
    };

    group = mkOption {
      type = types.str;
      default = "klipper-screen";
      description = lib.mdDoc ''
        Group account under which KlipperScreen runs.
      '';
    };

    settings = mkOption {
      inherit (format) type;
      default = {};
      description = lib.mdDoc ''
        Configuration for KlipperScreen. See the [documentation](https://klipperscreen.readthedocs.io/en/latest/Configuration/)
        for supported values.
      '';
    };
  };

  config = lib.mkIf cfg.enable (
    lib.mkMerge [
      {
        # assertions = [
        #   {
        #     assertion = cfg.enable -> config.services.moonraker.enable;
        #     message = "klipper-screen requires Moonraker to be enabled on this system. Please enable services.moonraker to use it.";
        #   }
        # ];

        users = {
          users.${cfg.user} = {
            isSystemUser = true;
            inherit (cfg) group;
            extraGroups = ["tty" "video"];
          };
          groups.${cfg.group} = {};
        };

        environment.etc."klipper-screen.cfg".source = format.generate "klipper-screen.cfg" cfg.settings;

        # for MPV and wayland
        hardware.graphics.enable = lib.mkDefault true;
      }
      (
        # x-server
        lib.mkIf config.services.xserver.enable {
          systemd.services.klipper-screen = {
            description = "KlipperScreen, the touchscreen GUI that interfaces with Klipper via Moonraker";

            after = lib.optionals config.services.moonraker.enable ["moonraker.service"];
            wantedBy = ["multi-user.target"];

            path = [
              pkgs.xorg-server
              pkgs.xauth
              pkgs.xinit
              pkgs.xsetroot
              pkgs.xset
              pkgs.nettools
              pkgs.util-linux
            ];

            serviceConfig = {
              Restart = "always";
              ExecStart = "${pkgs.xorg.xinit}/bin/xinit ${cfg.package}/bin/KlipperScreen --configfile /etc/klipper-screen.cfg -- /etc/X11/xinit/xserverrc";
              SupplementaryGroups = ["tty" "video"];
              # TODO: Make this work as non-root user as well
              # Group = cfg.group;
              # User = cfg.user;
            };
          };

          environment.etc."X11/Xwrapper.config".text = lib.mkDefault ''
            allowed_users=anybody
          '';
        }
      )
      (
        # wayland kiosk
        lib.mkIf (!config.services.xserver.enable) {
          systemd.services."cage-tty1".serviceConfig.Restart = "always";

          services.cage = {
            enable = true;
            inherit (cfg) user;
            environment = {
              GDK_BACKEND = "wayland";
            };
            extraArguments = ["-ds"];
            program = "${cfg.package}/bin/KlipperScreen --configfile /etc/klipper-screen.cfg";
          };
        }
      )
    ]
  );
}
