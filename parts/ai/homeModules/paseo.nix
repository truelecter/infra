{
  config,
  lib,
  pkgs,
  ...
}: let
  inherit (lib) literalExpression mkEnableOption mkIf mkOption mkPackageOption types;

  cfg = config.programs.paseo;

  jsonFormat = pkgs.formats.json {};

  inherit (config.home) homeDirectory;

  # Paseo's default home; PASEO_HOME moves it at runtime, which this module doesn't follow.
  paseoHome = ".paseo";
  pluginDirectory = "${paseoHome}/hm-plugins";

  sync = pkgs.writeShellApplication {
    name = "paseo-hm-sync";
    runtimeInputs = [pkgs.jq pkgs.coreutils];
    text = builtins.readFile ./paseo-sync.sh;
  };

  dev = pkgs.writeShellApplication {
    name = "paseo-plugin-dev";
    runtimeInputs = [pkgs.jq pkgs.coreutils pkgs.git];
    runtimeEnv = {
      PASEO_DEV_ROOT = "${homeDirectory}/${pluginDirectory}";
      PASEO_DEV_PLUGINS = jsonFormat.generate "paseo-dev-plugins.json" (lib.mapAttrs (_: plugin: "${plugin.package}") (lib.filterAttrs (_: plugin: plugin.package != null) cfg.plugins));
      PASEO_DEV_CLI = lib.optionalString cfg.cli.enable cli;
    };
    text = builtins.readFile ./paseo-plugin-dev.sh;
  };

  # The `paseo` command of the CLI package, used by activation and paseo-plugin-dev.
  cli = lib.getExe' cfg.cli.package "paseo";

  desired = jsonFormat.generate "paseo-hm.json" {
    inherit (cfg) settings;
    plugins =
      lib.mapAttrs (id: plugin: {
        path = "${homeDirectory}/${pluginDirectory}/${id}";
        inherit (plugin) enabled;
      })
      cfg.plugins;
    pluginRoot = "${homeDirectory}/${pluginDirectory}";
  };

  pluginModule = {name, ...}: {
    options = {
      package = mkOption {
        type = types.nullOr (types.either types.package types.path);
        default = pkgs.paseo-plugins.${name} or null;
        defaultText = literalExpression "pkgs.paseo-plugins.<name> or null";
        description = ''
          The plugin directory (with `paseo-plugin.json`). Defaults to the package of the same name
          from `overlays.ai`.
        '';
      };

      enabled = mkOption {
        type = types.bool;
        default = true;
        description = "Whether Paseo runs the plugin.";
      };
    };
  };
in {
  options.programs.paseo = {
    enable = mkEnableOption "managing the Paseo daemon's config.json and plugins";

    desktop = {
      enable = mkEnableOption "the Paseo desktop app; on macOS activation signs the copied app again (ad hoc)";

      package = mkPackageOption pkgs "paseo-desktop" {
        extraDescription = "`overlays.ai` adds `bin/paseo`, the CLI bundled in the app.";
      };
    };

    cli = {
      enable = mkOption {
        type = types.bool;
        default = true;
        description = ''
          Whether to put the Paseo CLI on PATH and use it during activation to apply plugin changes
          to a running daemon. Without it, or when the daemon isn't running, only
          {file}`~/.paseo/config.json` is written and the daemon picks it up on its next start. The
          desktop package from `overlays.ai` has `bin/paseo` of its own, so with the desktop app
          enabled `paseo` stays on PATH either way.
        '';
      };

      package = mkOption {
        type = types.package;
        default =
          if cfg.desktop.enable
          then cfg.desktop.package
          else pkgs.paseo;
        defaultText = literalExpression "if config.programs.paseo.desktop.enable then config.programs.paseo.desktop.package else pkgs.paseo";
        description = ''
          The package whose `bin/paseo` is the CLI. With the desktop app that is the app's own CLI,
          the same version and runtime as the daemon the app runs; without it, the Paseo server
          package.
        '';
      };
    };

    pluginDev = {
      enable = mkEnableOption "`paseo-plugin-dev`, which points a plugin's link at a checkout and back without a switch";

      package = mkOption {
        type = types.package;
        default = dev;
        defaultText = literalExpression "paseo-plugin-dev, built for the configured plugins, link folder, and CLI";
        description = ''
          The package with the `paseo-plugin-dev` command. The default knows the configured
          plugins and their installed builds, the link folder {file}`~/${pluginDirectory}`, and the
          CLI it reloads plugins with.
        '';
      };
    };

    pinWorkspace = {
      enable = mkEnableOption "`paseo-pin-workspace`, which pins or unpins a workspace in the local daemon's sidebar (Paseo's CLI and MCP tools have no pin command)";

      package = mkPackageOption pkgs "paseo-pin-workspace" {
        extraDescription = "From `overlays.ai`.";
      };
    };

    settings = mkOption {
      inherit (jsonFormat) type;
      default = {};
      example = {
        daemon.mcp.injectIntoAgents = true;
        agents.providers.omp.enabled = true;
      };
      description = ''
        Settings deep-merged into {file}`~/.paseo/config.json` on every activation: maps merge, lists
        and values replace what is there. Keys not set here stay as Paseo wrote them, and Paseo keeps
        writing the file (settings UI, `paseo daemon config set`), so a value changed from Paseo lasts
        until the next activation. The running daemon reloads the file (`paseo daemon reload`).
        Plugins go in {option}`programs.paseo.plugins`. The config schema is strict: an unknown key
        makes the daemon reject the file.
      '';
    };

    plugins = mkOption {
      type = types.attrsOf (types.submodule pluginModule);
      default = {};
      example = literalExpression ''
        {
          wide-chat = { };
          vpn.enabled = false;
        }
      '';
      description = ''
        Paseo plugins by id. Each is linked to {file}`~/${pluginDirectory}/<id>` and listed in
        {file}`~/.paseo/config.json` under that path, so the entry stays the same across rebuilds.
        On activation a running daemon installs new plugins, enables or disables changed ones, and
        reloads those whose link target changed. A plugin removed from here, or one Paseo had loaded
        from another path, takes effect at the next Paseo restart; its settings in
        {file}`~/.paseo/plugin-settings` are kept.

        A plugin package with a `cli` attribute (`backlog`'s `backlog` command) also puts that
        command on PATH.

        To develop a plugin without a switch, `paseo-plugin-dev link <id>` (from
        {option}`programs.paseo.pluginDev`) points its link at a checkout and
        `paseo-plugin-dev restore <id>` points it back. The links are `force`d, so the next
        activation replaces a repointed link instead of failing.
      '';
    };
  };

  config = mkIf cfg.enable {
    assertions =
      [
        {
          assertion = !(cfg.settings ? plugins);
          message = "Set Paseo plugins through `programs.paseo.plugins`, not `programs.paseo.settings.plugins`.";
        }
      ]
      ++ lib.mapAttrsToList (id: plugin: {
        assertion = plugin.package != null;
        message = "`programs.paseo.plugins.${id}` needs `package` (there is no `pkgs.paseo-plugins.${id}`).";
      })
      cfg.plugins;

    # The desktop app, the CLI (the app itself when it is the CLI package), paseo-plugin-dev,
    # paseo-pin-workspace, plus the commands that ship with plugins (passthru.cli).
    home.packages =
      lib.unique (lib.optional cfg.desktop.enable cfg.desktop.package ++ lib.optional cfg.cli.enable cfg.cli.package)
      ++ lib.optional cfg.pluginDev.enable cfg.pluginDev.package
      ++ lib.optional cfg.pinWorkspace.enable cfg.pinWorkspace.package
      ++ lib.concatMap (plugin: lib.optional (plugin.package ? cli) plugin.package.cli) (lib.attrValues cfg.plugins);

    # `force`: a link repointed by `paseo-plugin-dev link` is a symlink Home Manager doesn't own;
    # without it the collision check fails the switch. Only the link is replaced, never its target.
    home.file = lib.mapAttrs' (id: plugin:
      lib.nameValuePair "${pluginDirectory}/${id}" {
        source = plugin.package;
        force = true;
      })
    cfg.plugins;

    # The link targets before Home Manager relinks the plugins (including a hand-repointed link), so
    # the sync reloads every running plugin whose target changes.
    home.activation.paseoPluginTargets = lib.hm.dag.entryBetween ["linkGeneration"] ["writeBoundary"] ''
      paseoPluginTargetsBefore=$(${lib.getExe sync} targets ${desired})
    '';

    # After the plugin links exist.
    home.activation.paseoConfig = lib.hm.dag.entryAfter ["writeBoundary" "linkGeneration"] ''
      run env PASEO_HOME=${lib.escapeShellArg "${homeDirectory}/${paseoHome}"} \
        ${lib.optionalString cfg.cli.enable "PASEO_CLI=${lib.escapeShellArg cli}"} \
        PASEO_HM_TARGETS_BEFORE="''${paseoPluginTargetsBefore:-}" \
        ${lib.getExe sync} apply ${desired}
    '';

    # copyApps copies the app out of the store; sign the copy again so macOS accepts the bundle.
    home.activation.signPaseo = mkIf (cfg.desktop.enable && pkgs.stdenv.hostPlatform.isDarwin) (
      lib.hm.dag.entryAfter ["copyApps"] ''
        app="$HOME/Applications/Home Manager Apps/Paseo.app"
        if [[ -d "$app" ]]; then
          run /usr/bin/codesign --force --deep --sign - "$app"
        fi
      ''
    );
  };
}
