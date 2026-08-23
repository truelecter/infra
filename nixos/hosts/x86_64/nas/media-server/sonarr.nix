{
  config,
  options,
  inputs,
  lib,
  ...
}: let
  secret = key: config.sops.secrets.${key}.path;
in {
  nixflix = {
    seerr.sonarr = let
      defaults = options.nixflix.seerr.sonarr.default;
    in {
      Sonarr =
        defaults.Sonarr
        // {
          activeProfileName = "1080p Balanced";
        };

      "Sonarr Anime" =
        defaults."Sonarr Anime"
        // {
          activeProfileName = "Anime 1080p";
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
