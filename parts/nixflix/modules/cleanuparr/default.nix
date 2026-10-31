# Cleanuparr (https://github.com/Cleanuparr/Cleanuparr) in the nixflix style.
#
# Written to be moved into nixflix as `modules/cleanuparr/default.nix`. The
# only difference is the `nixflix` argument: inside nixflix, the two imports
# below become `../../lib/secrets` and `../../lib/mkVirtualHosts.nix`.
#
# Cleanuparr isn't packaged in nixpkgs, so it runs as an OCI container.
# Cleanuparr keeps its settings in SQLite and has no config file, so
# `cleanuparr-config` pushes the declared settings through its API on every
# activation and removes instances, clients and rules that aren't declared.
{nixflix}: {
  config,
  lib,
  pkgs,
  ...
}:
with lib; let
  secrets = import "${nixflix}/lib/secrets" {inherit lib;};
  inherit (import "${nixflix}/lib/mkVirtualHosts.nix" {inherit lib config;}) mkVirtualHost;

  cfg = config.nixflix.cleanuparr;
  inherit (config.nixflix) globals;
  hostname = "${cfg.subdomain}.${config.nixflix.reverseProxy.domain}";
  inherit (config.virtualisation.oci-containers) backend;
  jsonFormat = pkgs.formats.json {};

  curl = getExe pkgs.curl;
  jq = getExe pkgs.jq;

  arrType = arrName: defaultVersion:
    types.submodule {
      options = {
        url = mkOption {
          type = types.str;
          example = "http://127.0.0.1:7878";
          description = "URL of the ${arrName} instance, including its URL base.";
        };

        apiKey = secrets.mkSecretOption {description = "${arrName} API key.";};

        version = mkOption {
          type = types.int;
          default = defaultVersion;
          description = "Major version of ${arrName}.";
        };
      };
    };

  defaultArr = service: name:
    optionalAttrs (config.nixflix.${service}.enable or false) {
      ${name} = let
        arr = config.nixflix.${service};
      in {
        url = "http://${arr.connectionAddress}:${toString arr.config.hostConfig.port}${arr.config.hostConfig.urlBase}";
        inherit (arr.config) apiKey;
      };
    };

  downloadClientType = types.submodule {
    options = {
      typeName = mkOption {
        type = types.enum [
          "qBittorrent"
          "Deluge"
          "Transmission"
          "uTorrent"
          "rTorrent"
          "Sabnzbd"
        ];
        description = "Download client type.";
      };

      host = mkOption {
        type = types.str;
        example = "http://127.0.0.1:8080";
        description = "URL of the download client.";
      };

      urlBase = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = "URL base of the download client.";
      };

      username = secrets.mkSecretOption {
        nullable = true;
        description = "Username for the download client.";
      };

      password = secrets.mkSecretOption {
        nullable = true;
        description = "Password for the download client.";
      };
    };
  };

  qbittorrent = config.nixflix.torrentClients.qbittorrent;

  defaultDownloadClients = optionalAttrs (qbittorrent.enable or false) {
    qBittorrent = {
      typeName = "qBittorrent";
      host = "http://${qbittorrent.connectionAddress}:${toString qbittorrent.webuiPort}";
      username = config.services.qbittorrent.serverConfig.Preferences.WebUI.Username or null;
      password = qbittorrent.password or null;
    };
  };

  # Fields shared by stall and slow rules. Defaults match Cleanuparr's.
  ruleOptions = {
    enabled = mkOption {
      type = types.bool;
      default = true;
      description = "Whether the rule is active.";
    };

    maxStrikes = mkOption {
      type = types.ints.between 3 5000;
      default = 3;
      description = ''
        Strikes before the download is removed. The Queue Cleaner adds one
        strike per run, so a download is removed after `maxStrikes - 1` runs:
        with the default 5-minute schedule, 7 strikes is 30 minutes.
      '';
    };

    privacyType = mkOption {
      type = types.enum [
        "Public"
        "Private"
        "Both"
      ];
      default = "Public";
      description = "Which torrents the rule applies to, by tracker privacy.";
    };

    minCompletionPercentage = mkOption {
      type = types.ints.between 0 100;
      default = 0;
      description = "Lowest completion percentage the rule applies to.";
    };

    maxCompletionPercentage = mkOption {
      type = types.ints.between 1 100;
      default = 100;
      description = "Highest completion percentage the rule applies to.";
    };

    resetStrikesOnProgress = mkOption {
      type = types.bool;
      default = true;
      description = "Clear the strikes when the download makes progress.";
    };

    deletePrivateTorrentsFromClient = mkOption {
      type = types.bool;
      default = false;
      description = ''
        Also remove private torrents and their data from the download client.
        Otherwise they only leave the arr queue.
      '';
    };

    changeCategory = mkOption {
      type = types.bool;
      default = false;
      description = "Move the download to another category instead of removing it.";
    };
  };

  stallRuleType = types.submodule {
    freeformType = jsonFormat.type;
    options =
      ruleOptions
      // {
        minimumProgress = mkOption {
          type = types.nullOr types.str;
          default = null;
          example = "10MB";
          description = "Progress needed to clear the strikes, such as `10MB`.";
        };
      };
  };

  slowRuleType = types.submodule {
    freeformType = jsonFormat.type;
    options =
      ruleOptions
      // {
        minSpeed = mkOption {
          type = types.nullOr types.str;
          default = null;
          example = "100KB";
          description = "Downloads slower than this per second get a strike, such as `100KB`.";
        };

        maxTimeHours = mkOption {
          type = types.number;
          default = 0;
          description = "Downloads with a longer estimated time left get a strike. 0 disables it.";
        };

        ignoreAboveSize = mkOption {
          type = types.nullOr types.str;
          default = null;
          example = "50GB";
          description = "Skip downloads larger than this.";
        };

        ignoreWhileAltSpeedActive = mkOption {
          type = types.bool;
          default = true;
          description = "Skip the rule while the download client's alternative speed limits are on.";
        };
      };
  };

  queueCleanerConfig =
    recursiveUpdate {
      enabled = cfg.queueCleaner.enable;
      cronExpression = cfg.queueCleaner.schedule;
      useAdvancedScheduling = true;
      failedImport = {
        maxStrikes = 0;
        ignorePrivate = false;
        deletePrivate = false;
        skipIfNotFoundInClient = true;
        patterns = [];
        patternMode = "Include";
        changeCategory = false;
        forceImport = false;
        forceImportMaxTries = 3;
      };
      downloadingMetadataMaxStrikes = 0;
      errored = {
        maxStrikes = 0;
        ignorePrivate = false;
        deletePrivate = false;
        changeCategory = false;
      };
      processNoContentId = false;
      ignoredDownloads = [];
    }
    cfg.queueCleaner.settings;

  # Shell expression printing `value` as JSON, with `_secret` refs read from
  # their files at runtime.
  toJsonCmd = value: let
    secretArgs = secrets.mkNestedJqSecretArgs value;
    filter = concatStringsSep " | " (["$base"] ++ secretArgs.assignments);
  in "${jq} -n ${secretArgs.flagsString} --argjson base ${escapeShellArg (builtins.toJSON (secrets.stripSecretRefs value))} ${escapeShellArg filter}";

  # Shell lines that make the items at `listUrl` match `items` by name.
  syncNamed = {
    listUrl,
    listPath,
    itemUrl,
    items,
    extra ? (_: {}),
  }: ''
    api ${escapeShellArg listUrl} \
      | ${jq} -r --argjson keep ${escapeShellArg (builtins.toJSON (attrNames items))} \
        '${listPath}[] | select(.name as $n | $keep | index($n) | not) | "\(.id)\t\(.name)"' \
      | while IFS=$'\t' read -r id name; do
        echo "Deleting $name"
        api -X DELETE ${escapeShellArg itemUrl}/"$id" >/dev/null
      done

    ${concatStrings (mapAttrsToList (name: item: ''
        upsert ${escapeShellArg listUrl} ${escapeShellArg listPath} ${escapeShellArg itemUrl} "$(${toJsonCmd ({inherit name;} // extra item // item)})"
      '')
      items)}
  '';

  apiBase = "http://127.0.0.1:${toString cfg.port}/api";

  dependencies =
    optional (config.nixflix.radarr.enable or false) "radarr.service"
    ++ optional (config.nixflix.sonarr.enable or false) "sonarr.service"
    ++ optional (qbittorrent.enable or false) "qbittorrent.service";
in {
  options.nixflix.cleanuparr = {
    enable = mkEnableOption "Cleanuparr, which removes stalled and slow downloads from the arrs and searches again";

    image = mkOption {
      type = types.str;
      default = "ghcr.io/cleanuparr/cleanuparr:2.10.12";
      description = "Cleanuparr container image.";
    };

    user = mkOption {
      type = types.str;
      default = "cleanuparr";
      description = "User under which Cleanuparr runs.";
    };

    group = mkOption {
      type = types.str;
      default = "cleanuparr";
      description = "Group under which Cleanuparr runs.";
    };

    uid = mkOption {
      type = types.nullOr types.int;
      default = globals.uids.cleanuparr or null;
      defaultText = literalExpression "config.nixflix.globals.uids.cleanuparr or null";
      description = "UID of the Cleanuparr user, passed to the container as `PUID`.";
    };

    gid = mkOption {
      type = types.nullOr types.int;
      default = globals.gids.cleanuparr or null;
      defaultText = literalExpression "config.nixflix.globals.gids.cleanuparr or null";
      description = "GID of the Cleanuparr group, passed to the container as `PGID`.";
    };

    dataDir = mkOption {
      type = types.path;
      default = "${config.nixflix.stateDir}/cleanuparr";
      defaultText = literalExpression ''"''${nixflix.stateDir}/cleanuparr"'';
      description = "Directory containing Cleanuparr state and SQLite databases.";
    };

    port = mkOption {
      type = types.port;
      default = 11011;
      description = "Port on which Cleanuparr listens.";
    };

    bindAddress = mkOption {
      type = types.str;
      default =
        if config.nixflix.reverseProxy.enable
        then "127.0.0.1"
        else "0.0.0.0";
      defaultText = literalExpression ''if config.nixflix.reverseProxy.enable then "127.0.0.1" else "0.0.0.0"'';
      description = "Address on which Cleanuparr listens. The container uses the host network.";
    };

    openFirewall = mkOption {
      type = types.bool;
      default = false;
      description = "Open the Cleanuparr port in the firewall.";
    };

    subdomain = mkOption {
      type = types.str;
      default = "cleanuparr";
      description = "Subdomain prefix for reverse proxy routing.";
    };

    reverseProxy.expose = mkOption {
      type = types.bool;
      default = true;
      description = "Whether to expose Cleanuparr via the reverse proxy.";
    };

    username = mkOption {
      type = types.str;
      default = "admin";
      description = "Cleanuparr account name, created on first start.";
    };

    password = secrets.mkSecretOption {
      description = "Cleanuparr account password, 8 to 128 characters.";
    };

    radarr = mkOption {
      type = types.attrsOf (arrType "Radarr" 6);
      default = defaultArr "radarr" "Radarr";
      defaultText = literalExpression "Radarr from config.nixflix.radarr when enabled, otherwise {}";
      description = "Radarr instances, by name.";
    };

    sonarr = mkOption {
      type = types.attrsOf (arrType "Sonarr" 4);
      default = defaultArr "sonarr" "Sonarr";
      defaultText = literalExpression "Sonarr from config.nixflix.sonarr when enabled, otherwise {}";
      description = "Sonarr instances, by name.";
    };

    downloadClients = mkOption {
      type = types.attrsOf downloadClientType;
      default = defaultDownloadClients;
      defaultText = literalExpression "qBittorrent from config.nixflix.torrentClients.qbittorrent when enabled, otherwise {}";
      description = "Download clients, by name.";
    };

    queueCleaner = {
      enable = mkOption {
        type = types.bool;
        default = true;
        description = "Whether to run the Queue Cleaner, which applies the stall and slow rules.";
      };

      schedule = mkOption {
        type = types.str;
        default = "0 0/5 * * * ?";
        description = "Quartz cron expression for Queue Cleaner runs.";
      };

      settings = mkOption {
        inherit (jsonFormat) type;
        default = {};
        example = {
          failedImport.maxStrikes = 3;
        };
        description = ''
          Extra Queue Cleaner settings merged into the request body, such as
          `failedImport`, `errored` and `downloadingMetadataMaxStrikes`. These
          cleaners are off by default.
        '';
      };

      stallRules = mkOption {
        type = types.attrsOf stallRuleType;
        default = {};
        example = {
          "Stalled for 30 min" = {
            maxStrikes = 7;
            privacyType = "Both";
          };
        };
        description = "Rules for downloads that stopped receiving data, by name.";
      };

      slowRules = mkOption {
        type = types.attrsOf slowRuleType;
        default = {};
        example = {
          "Below 100 KB/s for 1 hour" = {
            maxStrikes = 13;
            minSpeed = "100KB";
          };
        };
        description = "Rules for downloads below a minimum speed, by name.";
      };
    };
  };

  config = mkIf (config.nixflix.enable && cfg.enable) (mkMerge [
    (mkVirtualHost {
      inherit hostname;
      inherit (cfg.reverseProxy) expose;
      inherit (cfg) port;
      websocketUpgrade = true;
    })
    {
      assertions = [
        {
          assertion = cfg.uid != null && cfg.gid != null;
          message = "nixflix.cleanuparr.uid and nixflix.cleanuparr.gid must be set: the container needs fixed ids.";
        }
      ];

      users.users.${cfg.user} = {
        inherit (cfg) group uid;
        isSystemUser = true;
        home = cfg.dataDir;
      };

      users.groups.${cfg.group} = {inherit (cfg) gid;};

      systemd.tmpfiles.settings."10-cleanuparr" = {
        ${cfg.dataDir}.d = {
          mode = "0750";
          inherit (cfg) user group;
        };
      };

      virtualisation.oci-containers.containers.cleanuparr = {
        inherit (cfg) image;

        volumes = ["${cfg.dataDir}:/config"];

        # The arrs and download clients usually listen on the host's loopback.
        extraOptions = ["--network=host"];

        environment = {
          TZ =
            if config.time.timeZone != null
            then config.time.timeZone
            else "Etc/UTC";
          PUID = toString cfg.uid;
          PGID = toString cfg.gid;
          PORT = toString cfg.port;
          BIND_ADDRESS = cfg.bindAddress;
        };
      };

      systemd.services."${backend}-cleanuparr" = {
        after = ["nixflix-setup-dirs.service"] ++ config.nixflix.serviceDependencies;
        requires = ["nixflix-setup-dirs.service"] ++ config.nixflix.serviceDependencies;
      };

      systemd.services.cleanuparr-config = {
        description = "Configure Cleanuparr";
        after = ["${backend}-cleanuparr.service"] ++ dependencies;
        requires = ["${backend}-cleanuparr.service"];
        wantedBy = ["multi-user.target"];

        serviceConfig = {
          Type = "oneshot";
          RemainAfterExit = true;
        };

        script = ''
          set -euo pipefail

          BASE_URL=${escapeShellArg apiBase}

          ready=
          for _ in $(seq 1 60); do
            if ${curl} -sf "http://127.0.0.1:${toString cfg.port}/health" >/dev/null; then
              ready=1
              break
            fi
            sleep 2
          done
          if [ -z "$ready" ]; then
            echo "Cleanuparr did not become ready within 120s"
            exit 1
          fi

          post() {
            ${curl} -sSf -H "Content-Type: application/json" -X POST "$@"
          }

          CREDENTIALS=$(${toJsonCmd {inherit (cfg) username password;}})

          if ! ${curl} -sSf "$BASE_URL/auth/status" | ${jq} -e '.setupCompleted' >/dev/null; then
            echo "Creating the Cleanuparr account"
            post --data-binary @- "$BASE_URL/auth/setup/account" <<<"$CREDENTIALS" >/dev/null
            post "$BASE_URL/auth/setup/complete" >/dev/null
          fi

          TOKEN=$(post --data-binary @- "$BASE_URL/auth/login" <<<"$CREDENTIALS" | ${jq} -er '.tokens.accessToken')
          API_KEY=$(${curl} -sSf -H "Authorization: Bearer $TOKEN" "$BASE_URL/account/api-key" | ${jq} -er '.apiKey')

          api() {
            ${curl} -sSf -H "X-Api-Key: $API_KEY" -H "Content-Type: application/json" "$@"
          }

          # upsert <list url> <jq path to the list> <item url> <body>
          upsert() {
            local name id
            name=$(${jq} -r '.name' <<<"$4")
            id=$(api "$1" | ${jq} -r --arg n "$name" "$2 | map(select(.name == \$n)) | first | .id // empty")
            if [ -z "$id" ]; then
              echo "Creating $name"
              api -X POST --data-binary @- "$3" <<<"$4" >/dev/null
            else
              echo "Updating $name"
              api -X PUT --data-binary @- "$3/$id" <<<"$4" >/dev/null
            fi
          }

          ${concatMapStrings (type:
            syncNamed {
              listUrl = "${apiBase}/configuration/${type}";
              listPath = ".instances";
              itemUrl = "${apiBase}/configuration/${type}/instances";
              items = cfg.${type};
              extra = _: {enabled = true;};
            }) ["radarr" "sonarr"]}

          ${syncNamed {
            listUrl = "${apiBase}/configuration/download_client";
            listPath = ".clients";
            itemUrl = "${apiBase}/configuration/download_client";
            items = cfg.downloadClients;
            extra = _: {enabled = true;};
          }}

          ${toJsonCmd queueCleanerConfig} | api -X PUT --data-binary @- "$BASE_URL/configuration/queue_cleaner" >/dev/null

          # Undeclared rules go first: overlapping rules of one kind are rejected.
          ${syncNamed {
            listUrl = "${apiBase}/queue-rules/stall";
            listPath = ".";
            itemUrl = "${apiBase}/queue-rules/stall";
            items = cfg.queueCleaner.stallRules;
          }}

          ${syncNamed {
            listUrl = "${apiBase}/queue-rules/slow";
            listPath = ".";
            itemUrl = "${apiBase}/queue-rules/slow";
            items = cfg.queueCleaner.slowRules;
          }}
        '';
      };

      networking.firewall = mkIf cfg.openFirewall {allowedTCPPorts = [cfg.port];};
    }
  ]);
}
