{
  config,
  options,
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

  nixflix.seerr.radarr = let
    inherit (options.nixflix.seerr.radarr.default) Radarr;
  in {
    Radarr =
      Radarr
      // {
        activeProfileName = "1080p Balanced";
      };
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
