{
  config,
  inputs,
  lib,
  ...
}: let
  secret = key: config.sops.secrets.${key}.path;
in {
  nixflix.radarr = {
    enable = true;

    config = {
      apiKey._secret = secret "radarr-api-key";
      hostConfig = {
        password._secret = secret "radarr-password";
        authenticationRequired = "disabledForLocalAddresses";
      };
    };
  };

  nixflix.seerr.radarr.Radarr = {
    activeProfileName = "1080p Balanced";

    # default values (overriden because of how module created)
    hostname = config.nixflix.radarr.connectionAddress;
    port = config.nixflix.radarr.config.hostConfig.port or 7878;
    inherit (config.nixflix.radarr.config) apiKey;
    baseUrl = config.nixflix.radarr.config.hostConfig.urlBase;
    activeDirectory = builtins.head (config.nixflix.radarr.mediaDirs or ["/data/media/movies"]);
    isDefault = true;
    externalUrl =
      if config.nixflix.reverseProxy.enable
      then "${config.nixflix.seerr.externalUrlScheme}://${config.nixflix.radarr.subdomain}.${config.nixflix.reverseProxy.domain}${config.nixflix.radarr.config.hostConfig.urlBase}"
      else "";
  };

  sops.secrets = let
    owner = config.users.users.radarr.name;
    sopsFile = "${inputs.self}/secrets/arr.yaml";

    mkSecret = key: {
      "radarr-${key}" = {
        inherit sopsFile owner;

        key = "radarr/${key}";
      };
    };
  in
    lib.mergeAttrsList (
      map mkSecret ["api-key" "password"]
    );
}
