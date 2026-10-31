# Cleanuparr replaces stalled or very slow torrents: it removes the download
# (with data), blocklists the release in the arr and searches again, so the
# next best release gets grabbed.
{
  config,
  inputs,
  ...
}: let
  # Private torrents (Toloka, 0day.kiev) are included.
  rule = {
    privacyType = "Both";
    deletePrivateTorrentsFromClient = true;
  };
in {
  nixflix.cleanuparr = {
    enable = true;

    # Fixed, so the container gets real PUID/PGID values. These are the ids
    # the system allocated when the user was first created.
    uid = 985;
    gid = 977;

    bindAddress = "0.0.0.0";
    reverseProxy.expose = false;

    password._secret = config.sops.secrets.cleanuparr-password.path;

    queueCleaner = {
      stallRules."Stalled for 30 min" = rule // {maxStrikes = 7;};

      slowRules."Below 100 KB/s for 1 hour" =
        rule
        // {
          maxStrikes = 13;
          minSpeed = "100KB";
          ignoreWhileAltSpeedActive = false;
        };
    };
  };

  sops.secrets.cleanuparr-password = {
    sopsFile = "${inputs.self}/secrets/arr.yaml";
    key = "cleanuparr/password";
  };
}
