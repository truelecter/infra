{
  pkgs,
  lib,
  config,
  options,
  ...
}: let
  l = lib // builtins;
  cfg = config.services.minecraft-servers;

  inherit (lib) mkOption types;

  mkInstanceName = name: "mc-${name}";

  # Render EULA file
  eulaFile = builtins.toFile "eula.txt" ''
    # eula.txt managed by NixOS Configuration
    eula=true
  '';

  # Server config rendering
  serverPropertiesFile = serverProperties:
    pkgs.writeText "server.properties"
    (mkOptionText serverProperties);

  encodeOptionValue = value: let
    encodeBool = value:
      if value
      then "true"
      else "false";
    encodeString = value: lib.escape [":" "=" "'"] value;
    typeMap = {
      "bool" = encodeBool;
      "string" = encodeString;
    };
  in
    (typeMap.${builtins.typeOf value} or toString) value;

  mkOptionLine = name: value: let
    dotNames = ["query-port" "rcon-password" "rcon-port"];
    fixName = name:
      if lib.elem name dotNames
      then
        lib.stringAsChars
        (x:
          if x == "-"
          then "."
          else x)
        name
      else name;
  in "${fixName name}=${encodeOptionValue value}";

  mkOptionText = serverProperties: let
    # Merge declared options with extraConfig
    c =
      (builtins.removeAttrs serverProperties ["extra-options"])
      // serverProperties.extra-options;
  in
    lib.concatStringsSep "\n"
    (lib.mapAttrsToList mkOptionLine c);
in {
  options.services.minecraft-servers = {
    eula = mkOption {
      type = types.bool;
      default = false;
      description = ''
        Whether or not you accept the Minecraft EULA
      '';
    };

    users.extraGroups = mkOption {
      type = types.listOf types.str;
      default = [];
      description = ''
        Extra groups for minecraft instance users
      '';
    };

    instances = mkOption {
      type = types.attrsOf (types.submodule (import ./_options-minecraft-instance.nix {
        inherit pkgs;
        globalOptions = options;
      }));
      default = {};
      description = ''
        Define instances of Minecraft servers to run.
      '';
    };
  };

  # FIXME: convert this giant mess into lib.mkMerge for each instance
  config = let
    enabledInstances = l.filterAttrs (_: x: x.enable) cfg.instances;

    enabledResticBackups = l.filterAttrs (_: x: x.backup.restic.enable) enabledInstances;

    # Attrset options
    eachEnabledInstanceFrom = instances: f: l.mapAttrs' (i: c: let n = mkInstanceName i; in l.nameValuePair n (f n c)) instances;
    eachEnabledInstance = f: eachEnabledInstanceFrom enabledInstances f;

    eachEnabledInstanceFrom' = instances: f: l.concatMapAttrs (i: c: let name = mkInstanceName i; in f name c) instances;
    eachEnabledInstance' = f: eachEnabledInstanceFrom' enabledInstances f;

    serverPorts = l.mapAttrsToList (_: v: v.serverProperties.server-port) enabledInstances;
    rconPorts =
      l.mapAttrsToList
      (_: v: v.serverProperties.rcon-port)
      (l.filterAttrs (_: x: x.serverProperties.enable-rcon) enabledInstances);
    openRconPorts =
      l.mapAttrsToList
      (_: v: v.serverProperties.rcon-port)
      (l.filterAttrs (_: x: x.serverProperties.enable-rcon && x.openRcon) enabledInstances);
    queryPorts =
      l.mapAttrsToList
      (_: v: v.serverProperties.query-port)
      (l.filterAttrs (_: x: x.serverProperties.enable-query) enabledInstances);

    instancesWithFileConflict =
      l.filterAttrs (
        _: x: let
          targets = l.mapAttrsToList (_: v: v.target) x.customization.create;
        in
          (l.unique targets) != targets
      )
      enabledInstances;
  in {
    assertions = [
      {
        assertion = cfg.eula;
        message = "You must accept the Mojang EULA in order to run any servers.";
      }

      {
        assertion = (l.unique serverPorts) == serverPorts;
        message = "Your Minecraft server instances have overlapping server ports. They must be unique.";
      }

      {
        assertion = (l.unique rconPorts) == rconPorts;
        message = "Your Minecraft server instances have overlapping RCON ports. They must be unique.";
      }

      {
        assertion = (l.unique queryPorts) == queryPorts;
        message = "Your Minecraft server instances have overlapping query ports. They must be unique.";
      }

      (
        let
          allPorts = serverPorts ++ rconPorts ++ queryPorts;
        in {
          assertion = (l.unique allPorts) == allPorts;
          message = "Your Minecraft server instances have some overlapping ports among server, rcon and query ports. They must all be unique.";
        }
      )

      {
        assertion = (l.length (l.attrValues instancesWithFileConflict)) == 0;
        message = "Minecraft instances ${l.concatStringsSep ", " (l.mapAttrsToList (n: _: n) instancesWithFileConflict)} have conflicting file creation rules";
      }
    ];

    environment.systemPackages = [
      pkgs.bindfs
    ];

    networking.firewall.allowedUDPPorts = queryPorts;
    networking.firewall.allowedTCPPorts = serverPorts ++ queryPorts ++ openRconPorts;

    systemd.services =
      eachEnabledInstance' (
        name: icfg:
          {
            ${name} = {
              description = "Minecraft Server ${name}";
              wantedBy = ["multi-user.target"];
              after = ["network.target"];

              path = [
                icfg.jvmPackage
                pkgs.bash
              ];

              environment = {
                JVM_ARGS = icfg.jvmOptString;
                SERVER_ARGS = icfg.serverOpts;
                MCRCON_PORT = toString icfg.serverProperties.rcon-port;
                MCRCON_PASS = icfg.serverProperties.rcon-password;
              };

              serviceConfig = {
                Restart = "always";
                ExecStart = "${icfg.dirnames.workdir}/start.sh";
                ExecStop = "${pkgs.mcrcon}/bin/mcrcon stop";
                TimeoutStopSec = "60";
                User = name;
                WorkingDirectory = icfg.dirnames.workdir;
                EnvironmentFile = l.optionalString (l.isPath icfg.environmentFile) icfg.environmentFile;
              };

              unitConfig = {
                RequiresMountsFor = [icfg.dirnames.workdir];
              };

              preStart = ''
                rm eula.txt || echo no eula yet

                # Ensure EULA is accepted
                ln -sf ${eulaFile} eula.txt

                # This file must be writeable, because Mojang.
                cp ${serverPropertiesFile icfg.serverProperties} server.properties
                chmod 644 server.properties
              '';
            };
          }
          # FIXME: get rid of this condition in favor of noop service
          // l.optionalAttrs (l.length icfg.customization.remove > 0) {
            "${name}-rm-init" = let
              rmState = l.escapeShellArg "${icfg.dirnames.overlayRemove}";
              workdir = l.escapeShellArg "${icfg.dirnames.overlayWorkdirRemove}";
              rmTarget = l.escapeShellArg "${icfg.dirnames.overlayTargetRemove}";

              removeCommandsScript = pkgs.writeShellScript "${name}-remove-generator" ''
                # Try to umount in case of disaster
                trap "${pkgs.umount}/bin/umount ${rmTarget}" EXIT

                # Clear rm state
                rm -rf ${rmState}/*

                # Mount to temporary directories to create required whiteouts
                ${pkgs.mount}/bin/mount -t overlay overlay -o lowerdir=${icfg.serverPackage},upperdir=${rmState},workdir=${workdir} ${rmTarget}

                # Remove files
                ${lib.concatMapStrings (path: "\n rm -rf ${l.escapeShellArg "${icfg.dirnames.overlayTargetRemove}/${path}"}") icfg.customization.remove}

                ${pkgs.umount}/bin/umount ${rmTarget}
              '';
            in {
              description = "Minecraft Server ${name} remove overlay generator";
              wantedBy = ["multi-user.target"];

              serviceConfig = {
                ExecStart = "+${removeCommandsScript}";
                User = name;
              };

              restartTriggers = icfg.customization.remove;
            };
          }
      )
      // l.mapAttrs' (
        n: icfg: let
          b = "restic-backups-${mkInstanceName n}";
        in
          l.nameValuePair b {
            environment = {
              MCRCON_PORT = toString icfg.serverProperties.rcon-port;
              MCRCON_PASS = icfg.serverProperties.rcon-password;
            };
            # serviceConfig.EnvironmentFile = l.mkForce (
            #   l.flatten [
            #     (l.optionals (l.isPath icfg.environmentFile) [icfg.environmentFile])
            #     # (l.optionals (l.isString config.services.restic.backups.${b}.environmentFile) [config.services.restic.backups.${b}.environmentFile])
            #   ]
            # );
          }
      )
      enabledResticBackups;

    users = {
      users = eachEnabledInstance (name: icfg: {
        isSystemUser = true;
        group = "minecraft-servers";
        home = icfg.dirnames.base;
        createHome = true;
        homeMode = "775";
        extraGroups = icfg.user.extraGroups ++ cfg.users.extraGroups;
      });
      groups = {
        minecraft-servers = {};
      };
    };

    systemd.tmpfiles.rules = l.flatten (l.attrValues (
      eachEnabledInstance (
        name: icfg: let
          p = icfg.dirnames;
        in [
          "d '${p.overlayContainingDir}' 0775 ${name} minecraft-servers - -"
          "d '${p.overlayCombined}' 0775 ${name} minecraft-servers - -"
          "d '${p.overlayWorkdir}' 0775 ${name} minecraft-servers - -"
          "d '${p.overlayRemove}' 0775 ${name} minecraft-servers - -"
          "d '${p.overlayWorkdirRemove}' 0775 ${name} minecraft-servers - -"
          "d '${p.overlayTargetRemove}' 0775 ${name} minecraft-servers - -"
          "d '${p.state}' 0775 ${name} minecraft-servers - -"
          "d '${p.workdir}' 0775 ${name} minecraft-servers - -"
        ]
      )
    ));

    systemd.mounts = l.flatten (l.attrValues (
      eachEnabledInstance (
        name: icfg: let
          p = icfg.dirnames;

          createCommands =
            l.mapAttrsToList (_: {
              target,
              source,
              ...
            }: let
              to = l.escapeShellArg "${target}";
              from = l.escapeShellArg "${source}";
            in ''
              mkdir -p "$(dirname ${to})"

              if [ -d ${from} ]; then
                ${pkgs.outils}/bin/lndir -silent ${from} ${to}
              elif [ -f ${from} ]; then
                ln -s ${from} ${to}
              else
                echo "${from} is not a file or directory"
                exit 1
              fi
            '')
            (
              l.filterAttrs (_: v: v.enable) icfg.customization.create
            );

          createOverlay = pkgs.runCommandLocal "${name}-create-overlay" {} ''
            mkdir -p $out
            cd $out
            ${l.concatStrings createCommands}
          '';
        in [
          {
            after =
              [
                "systemd-tmpfiles-setup.service"
              ]
              ++ l.optionals (l.length icfg.customization.remove > 0) [
                "${name}-rm-init.service"
              ];

            what = "overlay";
            type = "overlay";

            where = p.overlayCombined;
            options = l.concatStringsSep "," [
              "lowerdir=${l.optionalString ((l.length icfg.customization.remove) > 0) "${icfg.dirnames.overlayRemove}:"}${l.optionalString ((l.length createCommands) > 0) "${createOverlay}:"}${icfg.serverPackage}"
              "upperdir=${p.state}"
              "workdir=${p.overlayWorkdir}"
            ];

            restartTriggers =
              [
                icfg.serverPackage
              ]
              ++ lib.optionals ((l.length createCommands) > 0) [createOverlay]
              ++ icfg.customization.remove;
          }

          {
            what = p.overlayCombined;
            type = "fuse.bindfs";

            where = p.workdir;
            options = l.concatStringsSep "," [
              "force-user=${name}"
              "force-group=minecraft-servers"
              "perms=0664:ug+X"
            ];

            unitConfig = {
              RequiresMountsFor = [p.overlayCombined];
            };
          }
        ]
      )
    ));

    services.restic.backups = eachEnabledInstanceFrom enabledResticBackups (
      name: icfg:
        {
          user = name;
          backupPrepareCommand = ''
            ${pkgs.mcrcon}/bin/mcrcon save-off
            ${pkgs.mcrcon}/bin/mcrcon save-all
          '';
          backupCleanupCommand = "${pkgs.mcrcon}/bin/mcrcon save-on";
          environmentFile = l.flatten [
            (l.optionals (l.isString icfg.environmentFile) [icfg.environmentFile])
            (l.optionals (l.isString icfg.backups.restic.environmentFile) [icfg.backups.restic.environmentFile])
          ];
        }
        // l.filterAttrs (n: _: n != "enable") icfg.backup.restic
    );
  };
}
