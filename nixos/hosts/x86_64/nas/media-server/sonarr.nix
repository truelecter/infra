{
  config,
  inputs,
  lib,
  ...
}: let
  secret = key: config.sops.secrets.${key}.path;
in {
  nixflix = {
    seerr.sonarr = {
      Sonarr = {
        activeProfileName = "1080p Balanced";

        # default values (overriden because of how module created)
        hostname = config.nixflix.sonarr.connectionAddress;
        port = config.nixflix.sonarr.config.hostConfig.port or 8989;
        inherit (config.nixflix.sonarr.config) apiKey;
        baseUrl = config.nixflix.sonarr.config.hostConfig.urlBase;
        activeDirectory = builtins.head (config.nixflix.sonarr.mediaDirs or ["/data/media/tv"]);
        activeAnimeDirectory = builtins.head (config.nixflix.sonarr.mediaDirs or ["/data/media/tv"]);
        seriesType = "standard";
        animeSeriesType = "standard";
        isDefault = true;
        externalUrl =
          if config.nixflix.reverseProxy.enable
          then "${config.nixflix.seerr.externalUrlScheme}://${config.nixflix.sonarr.subdomain}.${config.nixflix.reverseProxy.domain}${config.nixflix.sonarr.config.hostConfig.urlBase}"
          else "";
      };

      "Sonarr Anime" = {
        # activeProfileName = "Anime 1080p";

        # default values (overriden because of how module created)
        hostname = config.nixflix."sonarr-anime".connectionAddress;
        port = config.nixflix.sonarr-anime.config.hostConfig.port or 8990;
        inherit (config.nixflix.sonarr-anime.config) apiKey;
        baseUrl = config.nixflix.sonarr-anime.config.hostConfig.urlBase;
        activeDirectory = builtins.head (config.nixflix.sonarr-anime.mediaDirs or ["/data/media/anime"]);
        activeAnimeDirectory = builtins.head (config.nixflix.sonarr-anime.mediaDirs or ["/data/media/anime"]);
        seriesType = "standard";
        animeSeriesType = "anime";
        isDefault = false;
        externalUrl =
          if config.nixflix.reverseProxy.enable
          then "${config.nixflix.seerr.externalUrlScheme}://${config.nixflix.sonarr-anime.subdomain}.${config.nixflix.reverseProxy.domain}${config.nixflix.sonarr-anime.config.hostConfig.urlBase}"
          else "";
      };
    };

    sonarr = {
      enable = true;

      config = {
        apiKey._secret = secret "sonarr-generic-api-key";
        hostConfig = {
          password._secret = secret "sonarr-generic-password";
          authenticationRequired = "disabledForLocalAddresses";
        };
      };
    };

    sonarr-anime = {
      enable = true;

      config = {
        apiKey._secret = secret "sonarr-anime-api-key";
        hostConfig = {
          password._secret = secret "sonarr-anime-password";
          authenticationRequired = "disabledForLocalAddresses";
        };
      };
    };
  };

  sops.secrets = let
    owner = config.users.users.sonarr.name;
    sopsFile = "${inputs.self}/secrets/arr.yaml";

    mkSecret = {
      instance,
      key,
    }: {
      "sonarr-${instance}-${key}" = {
        inherit sopsFile owner;

        key = "sonarr/${instance}/${key}";
      };
    };
  in
    lib.mergeAttrsList (
      lib.mapCartesianProduct mkSecret {
        instance = ["generic" "anime"];
        key = ["api-key" "password"];
      }
    );
}
