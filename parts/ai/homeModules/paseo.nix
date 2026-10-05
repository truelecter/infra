{
  config,
  lib,
  pkgs,
  ...
}: let
  inherit (lib) literalExpression mkEnableOption mkIf mkOption types;

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
      PASEO_DEV_CLI = lib.optionalString (cfg.cli != null) cfg.cli;
    };
    text = builtins.readFile ./paseo-plugin-dev.sh;
  };

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

    cli = mkOption {
      type = types.nullOr types.str;
      default =
        if pkgs.stdenv.hostPlatform.isDarwin
        then "${homeDirectory}/Applications/Home Manager Apps/Paseo.app/Contents/Resources/bin/paseo"
        else null;
      defaultText = literalExpression ''
        "''${config.home.homeDirectory}/Applications/Home Manager Apps/Paseo.app/Contents/Resources/bin/paseo" on macOS, null elsewhere
      '';
      description = ''
        The Paseo CLI, used during activation to apply plugin changes to a running daemon. With
        `null`, or when the daemon isn't running, only {file}`~/.paseo/config.json` is written and the
        daemon picks it up on its next start.
      '';
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

        To develop a plugin without a switch, `paseo-plugin-dev link <id>` points its link at a
        checkout and `paseo-plugin-dev restore <id>` points it back. The links are `force`d, so the
        next activation replaces a repointed link instead of failing.
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

    # paseo-plugin-dev, plus the commands that ship with plugins (passthru.cli).
    home.packages = [dev] ++ lib.concatMap (plugin: lib.optional (plugin.package ? cli) plugin.package.cli) (lib.attrValues cfg.plugins);

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

    # After the plugin links exist, and after the app (with its CLI) is copied and signed.
    home.activation.paseoConfig = lib.hm.dag.entryAfter ["writeBoundary" "linkGeneration" "copyApps" "signPaseo"] ''
      run env PASEO_HOME=${lib.escapeShellArg "${homeDirectory}/${paseoHome}"} \
        ${lib.optionalString (cfg.cli != null) "PASEO_CLI=${lib.escapeShellArg cfg.cli}"} \
        PASEO_HM_TARGETS_BEFORE="''${paseoPluginTargetsBefore:-}" \
        ${lib.getExe sync} apply ${desired}
    '';
  };
}
