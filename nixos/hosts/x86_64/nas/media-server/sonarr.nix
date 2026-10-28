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
    seerr.sonarr.Sonarr =
      options.nixflix.seerr.sonarr.default.Sonarr
      // {
        activeProfileName = "1080p Balanced";
      };

    sonarr = {
      enable = true;

      config = {
        apiKey._secret = secret "sonarr-api-key";
        hostConfig = {
          password._secret = secret "sonarr-password";
          authenticationRequired = "enabled";
        };
      };
    };
  };

  sops.secrets = let
    owner = config.users.users.sonarr.name;
    sopsFile = "${inputs.self}/secrets/arr.yaml";

    mkSecret = key: {
      "sonarr-${key}" = {
        inherit sopsFile owner;

        key = "sonarr/generic/${key}";
      };
    };
  in
    lib.mergeAttrsList (
      map mkSecret ["api-key" "password"]
    );
}
