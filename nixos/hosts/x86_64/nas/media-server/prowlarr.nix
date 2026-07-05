{
  config,
  inputs,
  lib,
  ...
}: let
  secret = key: config.sops.secrets.${key}.path;
in {
  nixflix.prowlarr = {
    enable = true;

    config = {
      apiKey._secret = secret "prowlarr-api-key";

      hostConfig = {
        password._secret = secret "prowlarr-password";
        authenticationRequired = "disabledForLocalAddresses";
      };

      indexers = [
        {
          # name = "0day kiev";
          name = "0day.kiev";
          username._secret = secret "prowlarr-0day-username";
          password._secret = secret "prowlarr-0day-password";
          stripcyrillic = true;
          priority = 10;
        }
        {
          # name = "toloka to";
          name = "Toloka.to";
          username._secret = secret "prowlarr-toloka-username";
          password._secret = secret "prowlarr-toloka-password";
          stripCyrillicLetters = true;
          priority = 10;
        }
        {
          # name = "mazepa";
          name = "Mazepa";
          username._secret = secret "prowlarr-mazepa-username";
          password._secret = secret "prowlarr-mazepa-password";
          stripcyrillic = true;
          priority = 10;
        }
        {
          # name = "nyaa si";
          name = "Nyaa.si";
        }
        {
          # name = "pirate bay";
          name = "The Pirate Bay";
          priority = 50;
        }
        {
          # name = "rutracker org";
          name = "RuTracker.org";
          username._secret = secret "prowlarr-rutracker-username";
          password._secret = secret "prowlarr-rutracker-password";
          russianLetters = true;
          baseUrl = "https://rutracker.org/";
          priority = 49;
        }
      ];
    };
  };

  sops.secrets = let
    sopsFile = "${inputs.self}/secrets/arr.yaml";

    owner = config.users.users.prowlarr.name;

    mkProwlarrSecret = {
      service,
      type,
    }: {
      "prowlarr-${service}-${type}" = {
        inherit sopsFile owner;
        key = "prowlarr/${service}/${type}";
      };
    };
  in
    lib.mergeAttrsList (
      (
        lib.mapCartesianProduct mkProwlarrSecret {
          service = ["0day" "toloka" "mazepa" "rutracker"];
          type = ["username" "password"];
        }
      )
      ++ [
        {
          "prowlarr-password" = {
            inherit sopsFile owner;
            key = "prowlarr/password";
          };

          "prowlarr-api-key" = {
            inherit sopsFile owner;
            key = "prowlarr/api-key";
          };
        }
      ]
    );
}
