# Suspend to RAM while running on the inverter (grid down) and nobody uses
# the NAS. sirius wakes it with Wake-on-LAN, see sirius/nas-wake.nix.
{
  config,
  inputs,
  lib,
  pkgs,
  ...
}: let
  qbt = config.nixflix.torrentClients.qbittorrent;

  # Each check exits 0 when it sees activity, which keeps the NAS awake.
  # Matches run on captured output: `cmd | grep -q` under pipefail can fail
  # with SIGPIPE on a match and would read as "idle". A missing command (exit
  # 127) stops the autosuspend main loop, hence coreutils and grep everywhere.
  mkCheck = name: runtimeInputs: text: {
    class = "ExternalCommand";
    command = lib.getExe (pkgs.writeShellApplication {
      name = "autosuspend-check-${name}";
      runtimeInputs = runtimeInputs ++ [pkgs.coreutils pkgs.gnugrep];
      inherit text;
    });
  };
in {
  services.autosuspend = {
    enable = true;
    # The sphinx man build produces no man pages in this nixpkgs, which fails the
    # `man` output. Without docs, the test of the sphinx extension can't import sphinx.
    package =
      (pkgs.autosuspend.override {
        withDocs = false;
        withMan = false;
      }).overridePythonAttrs (old: {
        disabledTestPaths = (old.disabledTestPaths or []) ++ ["tests/test_ext_autosuspend.py"];
      });

    settings = {
      interval = 60;
      idle_time = 20 * 60;
    };

    checks = {
      # Read binary_sensor.inverter_grid as the read-only Home Assistant user
      # "nas". Only an explicit "off" allows sleep, so an unreachable Home
      # Assistant or an unavailable inverter keeps the NAS up.
      GridOnline = mkCheck "grid-online" [pkgs.curl pkgs.jq] ''
        token=$(cat ${config.sops.secrets.home-assistant-token.path} || true)
        state=$(curl -fsS --max-time 5 -H "Authorization: Bearer $token" \
          http://10.3.0.129:8123/api/states/binary_sensor.inverter_grid | jq -r .state || true)
        [ "$state" != "off" ]
      '';

      # Established connections to ssh, http(s) and smb from other hosts.
      # Clients behind the sirius proxy show up as 10.3.0.129.
      RemoteClients = mkCheck "remote-clients" [pkgs.iproute2 pkgs.gawk] ''
        peers=$(ss -Htn state established '( sport = :22 or sport = :80 or sport = :443 or sport = :139 or sport = :445 )' \
          | awk '{ peer = $4; sub(/^\[::ffff:/, "", peer); sub(/\]/, "", peer); print peer }')
        grep -vqE '^(127\.|::1:|10\.3\.0\.132:|10\.88\.|$)' <<<"$peers"
      '';

      Smb = {};

      QbittorrentDownloading = mkCheck "qbittorrent-downloading" [pkgs.curl pkgs.jq] ''
        api=http://127.0.0.1:${toString qbt.webuiPort}/api/v2
        jar=$(mktemp)
        trap 'rm -f "$jar"' EXIT
        password=$(cat ${config.sops.secrets.qbittorrent-password.path})
        curl -fsS -c "$jar" --data-urlencode username=${qbt.serverConfig.Preferences.WebUI.Username} \
          --data-urlencode "password=$password" "$api/auth/login" >/dev/null
        curl -fsS -b "$jar" "$api/torrents/info" \
          | jq -e 'any(.[]; .state == "downloading" or .state == "forcedDL" or .state == "metaDL")' >/dev/null
      '';

      NixBuilds = mkCheck "nix-builds" [pkgs.procps] ''
        grep -q '^nixbld' <<<"$(ps -eo user=)"
      '';

      ZfsScrub = mkCheck "zfs-scrub" [config.boot.zfs.package] ''
        grep -qE '(scrub|resilver) in progress' <<<"$(zpool status)"
      '';
    };
  };

  sops.secrets.home-assistant-token = {
    sopsFile = "${inputs.self}/secrets/home-assistant.yaml";
  };
}
