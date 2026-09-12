# Temporary override of nixflix's seerr-libraries unit.
# preview-oidc-new rejects unknown query params; nixflix still uses ?sync / ?enable.
{
  config,
  inputs,
  pkgs,
  lib,
  ...
}: let
  seerCfg = config.nixflix.seerr;

  seerrAuth = import "${inputs.nixflix}/modules/seerr/authUtil.nix" {
    inherit lib pkgs;
    cfg = seerCfg;
  };

  curl = lib.getExe pkgs.curl;
  jq = lib.getExe pkgs.jq;
  baseUrl = "http://${seerCfg.connectionAddress}:${toString seerCfg.port}";

  typeFilter =
    if seerCfg.jellyfin.libraryFilter.types == []
    then "true"
    else let
      typeList = map (t: ''"${t}"'') seerCfg.jellyfin.libraryFilter.types;
    in "[.type] | inside([${lib.concatStringsSep "," typeList}])";

  nameFilter =
    if seerCfg.jellyfin.libraryFilter.names == []
    then "true"
    else let
      nameList = map (n: ''"${n}"'') seerCfg.jellyfin.libraryFilter.names;
    in "[.name] | inside([${lib.concatStringsSep "," nameList}])";

  libraryFilterExpr = "select(${typeFilter} and ${nameFilter})";
in {
  systemd.services.seerr-libraries.script = lib.mkForce ''
    set -euo pipefail

    BASE_URL="${baseUrl}"

    source ${seerrAuth.authScript}

    echo "Syncing library list from Jellyfin..."
    LIBRARIES_RESPONSE=$(${curl} -sf -X POST \
      ${seerrAuth.curlAuthArgs} \
      "$BASE_URL/api/v1/settings/jellyfin/library/sync")

    echo "Available libraries:"
    echo "$LIBRARIES_RESPONSE" | ${jq} -r '.[] | "\(.id) - \(.name) (\(.type))"'

    ${
      if seerCfg.jellyfin.enableAllLibraries
      then ''
        LIBRARY_IDS=$(echo "$LIBRARIES_RESPONSE" | ${jq} -r '.[].id')
      ''
      else ''
        LIBRARY_IDS=$(echo "$LIBRARIES_RESPONSE" | ${jq} -r \
          '.[] | ${libraryFilterExpr} | .id')
      ''
    }

    if [ -z "$LIBRARY_IDS" ]; then
      echo "Warning: No libraries matched the filter criteria"
      exit 0
    fi

    echo "Enabling libraries:"
    echo "$LIBRARY_IDS"
    while IFS= read -r library_id; do
      [ -z "$library_id" ] && continue
      ${curl} -sf -X PUT \
        ${seerrAuth.curlAuthArgs} \
        -H "Content-Type: application/json" \
        -d '{"enabled": true}' \
        "$BASE_URL/api/v1/settings/jellyfin/library/$library_id" >/dev/null
    done <<< "$LIBRARY_IDS"
    echo "Libraries enabled successfully"
  '';
}
