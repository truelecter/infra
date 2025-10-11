{
  environment.etc.recyclarr-config.source = ./config;

  nixarr.recyclarr = {
    enable = true;
    configFile = "${./config}/config.yml";
    # https://github.com/rasmus-kirk/nixarr/issues/91
    # configuration = {
    #   radarr.radarr = {
    #     base_url = "http://localhost:7878";
    #     # api_key = "!env_var RADARR_API_KEY";
    #     delete_old_custom_formats = true;
    #     replace_existing_custom_formats = true;

    #     include = [
    #       {
    #         template = "radarr-quality-definition-movie";
    #       }
    #       {
    #         config = ./radarr/general-cfs.yml;
    #       }
    #       {
    #         config = ./radarr/general-qp.yml;
    #       }
    #       {
    #         config = ./radarr/anime-cfs.yml;
    #       }
    #       {
    #         config = ./radarr/anime-qp.yml;
    #       }
    #     ];
    #     media_naming = {
    #       folder = "default";
    #       movie = {
    #         rename = true;
    #         standard = "anime";
    #       };
    #     };
    #   };
    #   sonarr.sonarr = {
    #     base_url = "http://localhost:8989";
    #     # api_key = "!env_var SONARR_API_KEY";
    #     delete_old_custom_formats = true;
    #     replace_existing_custom_formats = true;
    #     include = [
    #       {
    #         template = "sonarr-quality-definition-series";
    #       }
    #       {
    #         template = "sonarr-quality-definition-anime";
    #       }
    #       {
    #         config = ./sonarr/general-cfs.yml;
    #       }
    #       {
    #         config = ./sonarr/general-qp.yml;
    #       }
    #       {
    #         config = ./sonarr/anime-cfs.yml;
    #       }
    #       {
    #         config = ./sonarr/anime-qp.yml;
    #       }
    #     ];
    #     media_naming = {
    #       series = "default";
    #       season = "default";
    #       episodes = {
    #         rename = true;
    #         standard = "no-episode-title";
    #         daily = "no-episode-title";
    #         anime = "no-episode-title";
    #       };
    #     };
    #   };
    # };
  };
}
