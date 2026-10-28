# Rename imported files to the arr naming format. Without it, releases with
# names Jellyfin can't parse (Cyrillic "С01Е01" and the like) land in the
# library as they are. nixflix doesn't manage the naming settings.
{
  config,
  inputs,
  lib,
  pkgs,
  ...
}: let
  curl = lib.getExe pkgs.curl;
  jq = lib.getExe pkgs.jq;

  mkNamingService = serviceName: renameField: let
    cfg = config.nixflix.${serviceName}.config;
    mkWaitForApiScript = import "${inputs.nixflix}/modules/arr-common/mkWaitForApiScript.nix" {inherit lib pkgs;};
  in {
    "${serviceName}-naming" = {
      description = "Configure ${serviceName} file renaming";
      after = ["${serviceName}-config.service"];
      requires = ["${serviceName}-config.service"];
      wantedBy = ["multi-user.target"];

      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        ExecStartPre = mkWaitForApiScript serviceName cfg;
        LoadCredential = "api-key:${cfg.apiKey._secret}";
      };

      script = ''
        set -euo pipefail

        URL="http://127.0.0.1:${toString cfg.hostConfig.port}${cfg.hostConfig.urlBase}/api/${cfg.apiVersion}/config/naming"

        api() {
          ${curl} -sSf -H "X-Api-Key: $(cat "$CREDENTIALS_DIRECTORY/api-key")" -H "Content-Type: application/json" "$@"
        }

        NAMING=$(api "$URL")
        ID=$(echo "$NAMING" | ${jq} -er .id)
        api -X PUT -d "$(echo "$NAMING" | ${jq} -c '.${renameField} = true')" "$URL/$ID" >/dev/null
        echo "${serviceName}: ${renameField} enabled"
      '';
    };
  };
in {
  systemd.services =
    mkNamingService "sonarr" "renameEpisodes"
    // mkNamingService "radarr" "renameMovies";
}
