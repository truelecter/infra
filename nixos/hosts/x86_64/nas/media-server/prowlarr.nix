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
        authenticationRequired = "enabled";
      };

      indexers = [
        {
          # name = "0day kiev";
          name = "0day.kiev";
          username._secret = secret "prowlarr-0day-username";
          password._secret = secret "prowlarr-0day-password";
          stripcyrillic = true;
          "torrentBaseSettings.appMinimumSeeders" = 2;
          priority = 10;
        }
        {
          # name = "toloka to";
          name = "Toloka.to";
          username._secret = secret "prowlarr-toloka-username";
          password._secret = secret "prowlarr-toloka-password";
          stripCyrillicLetters = true;
          "torrentBaseSettings.appMinimumSeeders" = 2;
          priority = 10;
        }
        {
          # name = "mazepa";
          name = "Mazepa";
          username._secret = secret "prowlarr-mazepa-username";
          password._secret = secret "prowlarr-mazepa-password";
          # Mazepa reports 0 seeders for almost every release, and the default
          # floor of 1 hides all of them.
          "torrentBaseSettings.appMinimumSeeders" = 0;
          stripcyrillic = true;
          priority = 10;
        }
        {
          # name = "nyaa si";
          name = "Nyaa.si";
          "torrentBaseSettings.appMinimumSeeders" = 5;
        }
        {
          # name = "pirate bay";
          name = "The Pirate Bay";
          "torrentBaseSettings.appMinimumSeeders" = 5;
          priority = 50;
        }
        {
          # name = "rutracker org";
          name = "RuTracker.org";
          username._secret = secret "prowlarr-rutracker-username";
          password._secret = secret "prowlarr-rutracker-password";
          russianLetters = true;
          # Russian MVO/dub releases otherwise parse as English in the arrs.
          addRussianToTitle = true;
          "torrentBaseSettings.appMinimumSeeders" = 2;
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
