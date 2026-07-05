{lib, ...}: let
  mediaBaseDomain = "xata.house";
  acmeMail = "andrew.panassiouk@gmail.com";
in {
  security.acme.certs = {
    "${mediaBaseDomain}" = {
      email = acmeMail;
      domain = "*.${mediaBaseDomain}";
    };
  };

  nixflix = {
    jellyfin.network.localNetworkAddresses = lib.mkForce [];
    radarr.config.hostConfig.bindAddress = "0.0.0.0";
    sonarr.config.hostConfig.bindAddress = "0.0.0.0";
    sonarr-anime.config.hostConfig.bindAddress = "0.0.0.0";
    prowlarr.config.hostConfig.bindAddress = "0.0.0.0";

    nginx = {
      enable = true;
      addHostsEntries = true;
      domain = "${mediaBaseDomain}";
      enableACME = true;
      forceSSL = true;
    };
  };
}
