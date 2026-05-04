{
  config,
  inputs,
  lib,
  ...
}: {
  nixarr.prowlarr = {
    enable = true;

    settings-sync = {
      enable-nixarr-apps = true;

      indexers = [
        {
          sort_name = "0day kiev";
          fields = {
            username.secret = config.sops.secrets.prowlarr-0day-username.path;
            password.secret = config.sops.secrets.prowlarr-0day-password.path;
            stripcyrillic = true;
          };
          priority = 10;
        }
        {
          sort_name = "toloka to";
          fields = {
            username.secret = config.sops.secrets.prowlarr-toloka-username.path;
            password.secret = config.sops.secrets.prowlarr-toloka-password.path;
            stripCyrillicLetters = true;
          };
          priority = 10;
        }
        {
          sort_name = "mazepa";
          fields = {
            username.secret = config.sops.secrets.prowlarr-mazepa-username.path;
            password.secret = config.sops.secrets.prowlarr-mazepa-password.path;
            stripcyrillic = true;
          };
          priority = 10;
        }
        {
          sort_name = "nyaa si";
        }
        {
          sort_name = "pirate bay";
          priority = 50;
        }
        {
          sort_name = "rutracker org";
          fields = {
            username.secret = config.sops.secrets.prowlarr-rutracker-username.path;
            password.secret = config.sops.secrets.prowlarr-rutracker-password.path;
            russianLetters = true;
            baseUrl = "https://rutracker.org/";
          };
          priority = 49;
        }
      ];
    };
  };

  services.prowlarr.settings.auth.required = "DisabledForLocalAddresses";

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
      lib.mapCartesianProduct mkProwlarrSecret {
        service = ["0day" "toloka" "mazepa" "rutracker"];
        type = ["username" "password"];
      }
    );
}
