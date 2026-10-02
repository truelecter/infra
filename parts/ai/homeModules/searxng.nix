{
  config,
  lib,
  pkgs,
  ...
}: let
  inherit
    (lib)
    literalExpression
    mkDefault
    mkEnableOption
    mkIf
    mkOption
    mkPackageOption
    types
    ;

  cfg = config.services.searxng;

  # Runtime files: the rendered settings.yml (may hold secrets), the generated secret key, the
  # favicons/limiter TOML files (SearXNG reads them next to settings.yml), and Valkey's data.
  stateDir = "${config.xdg.stateHome}/searxng";
  generatedSettingsFile = "${stateDir}/settings.yml";
  valkeySocket = "${stateDir}/valkey.sock";
  logFile = "${config.home.homeDirectory}/Library/Logs/searxng.log";

  q = lib.escapeShellArg;

  settingsTemplate = pkgs.writeText "searxng-settings.yml" (builtins.toJSON cfg.settings);
  tomlFormat = pkgs.formats.toml {};
  faviconsSettingsFile = tomlFormat.generate "favicons.toml" cfg.faviconsSettings;
  limiterSettingsFile = tomlFormat.generate "limiter.toml" cfg.limiterSettings;

  # Without a secret SearXNG refuses to start (`ultrasecretkey`). Generate one only when neither
  # `settings` nor a custom settings file can provide it; SEARXNG_SECRET would override both.
  generateSecret =
    cfg.settingsFile
    == generatedSettingsFile
    && !lib.hasAttrByPath ["server" "secret_key"] cfg.settings;

  linkToml = name: settings: file:
    if settings != {}
    then "ln -sfn ${file} ${q "${stateDir}/${name}"}"
    else "rm -f ${q "${stateDir}/${name}"}";

  launcher = pkgs.writeShellScript "searxng-launcher" ''
    set -euo pipefail
    PATH=${lib.makeBinPath [pkgs.coreutils pkgs.envsubst]}''${PATH:+:$PATH}
    umask 077
    mkdir -p ${q stateDir}

    ${lib.optionalString (cfg.environmentFile != null) ''
      set -a
      . ${q (toString cfg.environmentFile)}
      set +a
    ''}
    envsubst < ${settingsTemplate} > ${q "${generatedSettingsFile}.tmp"}
    mv ${q "${generatedSettingsFile}.tmp"} ${q generatedSettingsFile}
    ${linkToml "favicons.toml" cfg.faviconsSettings faviconsSettingsFile}
    ${linkToml "limiter.toml" cfg.limiterSettings limiterSettingsFile}

    ${lib.optionalString generateSecret ''
      if [ -z "''${SEARXNG_SECRET-}" ]; then
        secret=${q "${stateDir}/secret_key"}
        if [ ! -s "$secret" ]; then
          od -An -N32 -tx1 /dev/urandom | tr -d ' \n' > "$secret"
        fi
        SEARXNG_SECRET=$(cat "$secret")
        export SEARXNG_SECRET
      fi
    ''}
    export SEARXNG_SETTINGS_PATH=${q (toString cfg.settingsFile)}
    exec ${lib.getExe cfg.package}
  '';

  valkeyLauncher = pkgs.writeShellScript "searxng-valkey-launcher" ''
    set -euo pipefail
    umask 077
    ${pkgs.coreutils}/bin/mkdir -p ${q "${stateDir}/valkey"}
    exec ${lib.getExe' cfg.valkeyPackage "valkey-server"} \
      --port 0 \
      --unixsocket ${q valkeySocket} \
      --unixsocketperm 600 \
      --dir ${q "${stateDir}/valkey"}
  '';

  launchdKeepAlive = {
    Crashed = true;
    SuccessfulExit = false;
  };

  settingType =
    (types.oneOf [
      types.bool
      types.int
      types.float
      types.str
      (types.listOf settingType)
      (types.attrsOf settingType)
    ])
    // {
      description = "JSON value";
    };
in {
  options.services.searxng = {
    enable = mkEnableOption "SearXNG, the meta search engine, as a user service (systemd on Linux, launchd on macOS)";

    package = mkPackageOption pkgs "searxng" {};

    environmentFile = mkOption {
      type = types.nullOr types.path;
      default = null;
      example = "/run/secrets/searxng.env";
      description = ''
        File with `KEY=value` lines, sourced by the shell before the settings are rendered and
        SearXNG starts. Use it to keep secrets out of the Nix store and refer to them in
        [](#opt-services.searxng.settings) as `$VARIABLE_NAME`. Setting `SEARXNG_SECRET` here
        overrides `server.secret_key`.
      '';
    };

    redisCreateLocally = mkOption {
      type = types.bool;
      default = false;
      description = ''
        Run a Valkey user service for SearXNG on a Unix socket in
        {file}`$XDG_STATE_HOME/searxng/valkey.sock` and point `settings.valkey.url` at it.
        Required for the rate limiter and bot protection.
      '';
    };

    valkeyPackage = mkPackageOption pkgs "valkey" {};

    settings = mkOption {
      type = types.submodule {freeformType = settingType;};
      default = {};
      example = literalExpression ''
        {
          server.port = 8888;
          server.bind_address = "127.0.0.1";
          server.secret_key = "$SEARXNG_SECRET_KEY";
          search.formats = [ "html" "json" ];

          engines = [ {
            name = "wolframalpha";
            shortcut = "wa";
            api_key = "$WOLFRAM_API_KEY";
            engine = "wolframalpha_api";
          } ];
        }
      '';
      description = ''
        SearXNG settings, merged with (taking precedence over) the upstream default `settings.yml`
        while `use_default_settings` is `true` (the default here). Values may refer to variables
        from [](#opt-services.searxng.environmentFile) as `$VARIABLE_NAME`; the file is rendered
        at service start into {file}`$XDG_STATE_HOME/searxng/settings.yml`, readable only by the
        user.

        Without `server.secret_key` (and without a custom
        [](#opt-services.searxng.settingsFile)), a random key is generated once into
        {file}`$XDG_STATE_HOME/searxng/secret_key`.

        ::: {.note}
        For available settings, see the SearXNG [docs](https://docs.searxng.org/admin/settings/index.html).
        :::
      '';
    };

    settingsFile = mkOption {
      type = types.path;
      default = generatedSettingsFile;
      defaultText = literalExpression ''"''${config.xdg.stateHome}/searxng/settings.yml"'';
      description = ''
        The `settings.yml` SearXNG runs with. The default is the file rendered from
        [](#opt-services.searxng.settings).

        ::: {.note}
        Setting this option overrides [](#opt-services.searxng.settings). SearXNG then reads
        {file}`favicons.toml` and {file}`limiter.toml` from this file's directory, so
        [](#opt-services.searxng.faviconsSettings) and
        [](#opt-services.searxng.limiterSettings) no longer apply.
        :::

        ::: {.warning}
        A path literal is copied, with any secret key it contains, into the world-readable Nix
        store.
        :::
      '';
    };

    faviconsSettings = mkOption {
      type = types.attrsOf settingType;
      default = {};
      example = literalExpression ''
        {
          favicons = {
            cfg_schema = 1;
            cache = {
              db_url = "/Users/me/.cache/searxng/faviconcache.db";
              HOLD_TIME = 5184000;
              LIMIT_TOTAL_BYTES = 2147483648;
              BLOB_MAX_BYTES = 40960;
              MAINTENANCE_MODE = "auto";
              MAINTENANCE_PERIOD = 600;
            };
          };
        }
      '';
      description = ''
        Favicons settings for SearXNG, linked to {file}`$XDG_STATE_HOME/searxng/favicons.toml`.

        ::: {.note}
        For available settings, see the SearXNG
        [schema file](https://github.com/searxng/searxng/blob/master/searx/favicons/favicons.toml).
        :::
      '';
    };

    limiterSettings = mkOption {
      type = types.attrsOf settingType;
      default = {};
      example = literalExpression ''
        {
          real_ip = {
            x_for = 1;
            ipv4_prefix = 32;
            ipv6_prefix = 56;
          };
          botdetection.ip_lists.block_ip = [
            # "93.184.216.34" # example.org
          ];
        }
      '';
      description = ''
        Limiter settings for SearXNG, linked to {file}`$XDG_STATE_HOME/searxng/limiter.toml`.

        ::: {.note}
        For available settings, see the SearXNG
        [schema file](https://github.com/searxng/searxng/blob/master/searx/limiter.toml).
        :::
      '';
    };
  };

  config = mkIf cfg.enable {
    services.searxng.settings = {
      use_default_settings = mkDefault true;
      valkey = mkIf cfg.redisCreateLocally {url = "unix://${valkeySocket}";};
    };

    home.packages = [cfg.package];

    systemd.user.services = {
      searxng = {
        Unit =
          {
            Description = "SearXNG, the meta search engine";
            After = ["network.target"] ++ lib.optional cfg.redisCreateLocally "searxng-valkey.service";
          }
          // lib.optionalAttrs cfg.redisCreateLocally {
            Requires = ["searxng-valkey.service"];
          };
        Service = {
          ExecStart = toString launcher;
          Restart = "on-failure";
        };
        Install.WantedBy = ["default.target"];
      };

      searxng-valkey = mkIf cfg.redisCreateLocally {
        Unit.Description = "Valkey for SearXNG";
        Service = {
          ExecStart = toString valkeyLauncher;
          Restart = "on-failure";
        };
        Install.WantedBy = ["default.target"];
      };
    };

    launchd.agents = {
      searxng = {
        enable = true;
        config = {
          ProgramArguments = [(toString launcher)];
          RunAtLoad = true;
          KeepAlive = launchdKeepAlive;
          ProcessType = "Background";
          StandardOutPath = logFile;
          StandardErrorPath = logFile;
        };
      };

      searxng-valkey = mkIf cfg.redisCreateLocally {
        enable = true;
        config = {
          ProgramArguments = [(toString valkeyLauncher)];
          RunAtLoad = true;
          KeepAlive = launchdKeepAlive;
          ProcessType = "Background";
        };
      };
    };
  };
}
