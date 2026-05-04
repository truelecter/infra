{
  pkgs,
  globalOptions,
}: {
  name,
  lib,
  config,
  ...
}: let
  l = builtins // lib;
  inherit (lib) types mkOption mkEnableOption;

  mkJvmMxFlag = icfg: l.optionalString (icfg.jvmMaxAllocation != "") "-Xmx${icfg.jvmMaxAllocation}";
  mkJvmMsFlag = icfg: l.optionalString (icfg.jvmInitialAllocation != "") "-Xms${icfg.jvmInitialAllocation}";
  mkJvmOptString = icfg: "${mkJvmMxFlag icfg} ${mkJvmMsFlag icfg} ${icfg.jvmOpts}";

  instanceName = name;
in {
  options = {
    enable = mkEnableOption "Enable minecraft server instance ${name}";

    openRcon = mkOption {
      type = types.bool;
      default = false;
      description = ''
        Whether to open the RCON port in the firewall. Local RCON is used for server automation. Public RCON requires additional security.
      '';
    };

    # autoRestartTimer = mkOption {
    #   type = types.int;
    #   default = 0;
    #   description = ''
    #     Sets a wall timer in minutes to restart the server. How often this is
    #     necessary depends on mods, population, and activity. 24h is a decent
    #     default. Set to 0 to disable.

    #     The restart action will start a 15 minute timer, sending a global
    #     notification every 5 minutes to advise players about the restart. When
    #     the timer elapses, the unit is restarted.
    #   '';
    # };

    # autoRestartOpportunisticCheckTimer = mkOption {
    #   type = types.int;
    #   default = 0;
    #   description = ''
    #     Opportunistically restart the server when nobody is online. Sets a wall
    #     timer in minutes to check for currently online players. If two checks in
    #     a row find nobody online, restart the server if it hasn't been restarted
    #     within the last <literal>autoRestartOpportunisticMinInterval</literal>
    #     minutes.
    #   '';
    # };

    # autoRestartOpportunisticMinInterval = mkOption {
    #   type = types.int;
    #   default = 0;
    #   description = ''
    #     Minimum online interval for opportunistic server restart. Do not
    #     opportunistically restart the server unless at least this many minutes
    #     have elapsed since the last server start. This is to avoid restarting
    #     the server too often as people come and go.
    #   '';
    # };

    serverPackage = mkOption {
      type = types.package;
      description = ''
        Server package used as lowerdir of server state overlay.
      '';
    };

    jvmPackage = mkOption {
      type = types.package;
      default = pkgs.jre8;
      description = ''
        JVM package used to run the server.

        <emphasis>Note:</emphasis> Do not use the
        <literal>jre8_headless</literal> package. Modded minecraft needs
        <literal>awt</literal>.
      '';
    };

    jvmMaxAllocation = mkOption {
      type = types.str;
      default = "256M";
      description = ''
        Maximum memory allocation pool for the JVM, as set by
        <literal>-Xmx</literal>.

        Default is JVM default. You definitely want to change this.
      '';
    };

    jvmInitialAllocation = mkOption {
      type = types.str;
      default = "";
      description = ''
        Initial memory allocation pool for the JVM, as set by
        <literal>-Xms</literal>.

        Defaults to not being set.
      '';
    };

    jvmOpts = mkOption {
      type = types.str;
      default = "-XX:+UseG1GC -Dsun.rmi.dgc.server.gcInterval=2147483646 -XX:+UnlockExperimentalVMOptions -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M";
      description = ''
        JVM options used to call Minecraft on server startup.

        The default value should serve you well unless you have specific
        needs.

        Note: Do not include <literal>-Xms</literal> or
        <literal>-Xmx</literal> here.

        See <literal>jvmMaxAllocation</literal> for <literal>-Xmx</literal>
        and <literal>jvmInitialAllocation</literal> for
        <literal>-Xms</literal>.
      '';
    };

    serverOpts = mkOption {
      type = types.str;
      default = "nogui";
      description = ''
        Minecraft server options
      '';
    };

    jvmOptString = mkOption {
      type = types.str;
      default = mkJvmOptString config;
      readOnly = true;
      description = ''
        The compiled value of $JVMOPTS, exported as a read-only value.
      '';
    };

    dirnames = mkOption {
      type = types.attrs;
      default = rec {
        base = "/var/lib/minecraft-servers/${name}";
        state = "${base}/state";
        workdir = "${base}/workdir";
        overlayContainingDir = "${base}/overlays";
        overlayCombined = "${overlayContainingDir}/overlay";
        overlayWorkdir = "${overlayContainingDir}/work";
        overlayRemove = "${overlayContainingDir}/remove";
        overlayWorkdirRemove = "${overlayContainingDir}/removeWork";
        overlayTargetRemove = "${overlayContainingDir}/removeTarget";
      };
      readOnly = true;
      internal = true;
      description = ''
        Calculated paths for the server. May be will be customizable some day
      '';
    };

    serverProperties = mkOption {
      type = types.submodule ./_options-minecraft-properties.nix;
      description = ''
        Set options for <literal>server.properties</literal>.

        Option names, descriptions, and default values were taken from the
        <link
        linkend="https://minecraft.gamepedia.com/Server.properties">Minecraft
        Gamepedia</link>.

        Any options with dots in their names, such as
        <literal>rcon.password</literal> have had the dot substituted for a
        dash (<literal>rcon-password</literal>).

        <emphasis>NixOS Note:</emphasis> The white list, as well as the list
        of ops, banned players and banned IPs is maintained statefully, either
        by hand or through console commands/rcon.
      '';
    };

    environmentFile = mkOption {
      type = types.nullOr types.path;
      default = null;
      description = ''
        Environment file for server instance. For format, consult
        <literal>EnvironmentFile</literal> in <literal>systemd.exec</literal>
        man.
      '';
    };

    backup.restic = mkOption {
      type = types.submodule (import ./_options-backup-restic.nix {
        inherit globalOptions;
        instanceConfig = config;
      });
      default = {enable = false;};
    };

    user.extraGroups = mkOption {
      type = types.listOf types.str;
      default = [];
      description = ''
        Extra groups for minecraft instance user.
      '';
    };

    customization = {
      remove = mkOption {
        type = types.listOf types.str;
        default = [];
        description = ''
          List of files to remove before starting server from server package.
          Takes priority over file creation (i.e. if the same file will be specified in <literal>
          create</literal>, it will be deleted).

          <emphasis>Note:</emphasis> root access is required to temporary mount overlay to create
          whiteouts for listed files.
        '';
      };

      create = mkOption {
        type = types.attrsOf (
          types.submodule (import ./_options-customization-file.nix {inherit pkgs instanceName;})
        );
        default = {};
        description = ''
          Set of files to place in overlay on top of server package
        '';
      };
    };
  };
}
