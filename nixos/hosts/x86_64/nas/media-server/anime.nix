# Anime gets its own root folders in the main Sonarr and Radarr and its own
# Jellyfin libraries.
#
# - Shows: Seerr routes series with the TMDB "anime" keyword to the Sonarr
#   anime root folder and profile on its own.
# - Movies: Seerr has no anime handling for Radarr, so an override rule on the
#   Radarr server matches the same keyword.
{
  config,
  inputs,
  lib,
  pkgs,
  ...
}: let
  inherit (config) nixflix;
  seerCfg = nixflix.seerr;

  animeShowsDir = "${nixflix.mediaDir}/anime";
  animeMoviesDir = "${nixflix.mediaDir}/anime-movies";
  animeProfileName = "Anime 1080p";
  # https://www.themoviedb.org/keyword/210024-anime
  animeKeywordId = "210024";

  seerrAuth = import "${inputs.nixflix}/modules/seerr/authUtil.nix" {
    inherit lib pkgs;
    cfg = seerCfg;
  };

  curl = lib.getExe pkgs.curl;
  jq = lib.getExe pkgs.jq;

  libraryDir = path: {
    ${path}.d = {
      inherit (nixflix.globals.libraryOwner) user group;
      mode = "0775";
    };
  };

  typeOption = type: {
    images,
    metadata,
  }: {
    inherit type;
    imageFetchers = images;
    imageFetcherOrder = images;
    metadataFetchers = metadata;
    metadataFetcherOrder = metadata;
  };

  anidbFetchers = ["AniDB" "TheMovieDb" "The Open Movie Database"];
in {
  nixflix = {
    sonarr.config.rootFolders =
      map (path: {inherit path;}) (nixflix.sonarr.mediaDirs ++ [animeShowsDir]);

    radarr.config.rootFolders =
      map (path: {inherit path;}) (nixflix.radarr.mediaDirs ++ [animeMoviesDir]);

    # Forced over the nixflix defaults that sonarr.nix merges in, which point
    # anime at the regular shows folder.
    seerr.sonarr.Sonarr = {
      activeAnimeDirectory = lib.mkForce animeShowsDir;
      activeAnimeProfileName = animeProfileName;
      animeSeriesType = lib.mkForce "anime";
    };

    jellyfin = {
      libraries = {
        Anime = {
          collectionType = "tvshows";
          paths = [animeShowsDir];

          typeOptions = [
            (typeOption "Series" {
              images = ["AniDB" "TheMovieDb"];
              metadata = anidbFetchers;
            })
            (typeOption "Season" {
              images = ["AniDB" "TheMovieDb"];
              metadata = ["AniDB" "TheMovieDb"];
            })
            (typeOption "Episode" {
              images = ["TheMovieDb" "The Open Movie Database" "Embedded Image Extractor" "Screen Grabber"];
              metadata = anidbFetchers;
            })
          ];
        };

        "Anime Movies" = {
          collectionType = "movies";
          paths = [animeMoviesDir];

          typeOptions = [
            (typeOption "Movie" {
              images = anidbFetchers;
              metadata = anidbFetchers;
            })
          ];
        };
      };

      # nixflix sets these only while sonarr-anime is enabled.
      plugins.AniDB.config = {
        TitlePreference = "Localized";
        OriginalTitlePreference = "JapaneseRomaji";
        IgnoreSeason = false;
        TitleSimilarityThreshold = "50";
        MaxGenres = "5";
        TidyGenreList = true;
        TitleCaseGenres = false;
        AnimeDefaultGenre = "Anime";
        AniDbRateLimit = "2000";
        MaxCacheAge = "7";
        AniDbReplaceGraves = true;
      };
    };
  };

  systemd.tmpfiles.settings = {
    "10-sonarr" = libraryDir animeShowsDir;
    "10-radarr" = libraryDir animeMoviesDir;
  };

  systemd.services.seerr-override-rules = {
    description = "Configure Seerr override rules";
    after = ["seerr-radarr.service"];
    requires = ["seerr-radarr.service"];
    wantedBy = ["multi-user.target"];

    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
    };

    script = ''
      set -euo pipefail

      BASE_URL="http://${seerCfg.connectionAddress}:${toString seerCfg.port}/api/v1"

      source ${seerrAuth.authScript}

      api() {
        ${curl} -sSf ${seerrAuth.curlAuthArgs} -H "Content-Type: application/json" "$@"
      }

      RADARR_ID=$(api "$BASE_URL/settings/radarr" | ${jq} -er '.[] | select(.isDefault and (.is4k | not)) | .id')
      PROFILE_ID=$(api "$BASE_URL/settings/radarr/$RADARR_ID/profiles" \
        | ${jq} -er --arg name ${lib.escapeShellArg animeProfileName} '.[] | select(.name == $name) | .id')

      RULE=$(${jq} -n \
        --argjson radarr "$RADARR_ID" \
        --argjson profile "$PROFILE_ID" \
        --arg keywords ${animeKeywordId} \
        --arg rootFolder ${lib.escapeShellArg animeMoviesDir} \
        '{radarrServiceId: $radarr, keywords: $keywords, rootFolder: $rootFolder, profileId: $profile}')

      EXISTING_IDS=$(api "$BASE_URL/overrideRule" \
        | ${jq} -r --argjson radarr "$RADARR_ID" --arg keywords ${animeKeywordId} \
          '.[] | select(.radarrServiceId == $radarr and .keywords == $keywords) | .id')

      if [ -z "$EXISTING_IDS" ]; then
        echo "Creating anime movies override rule"
        api -X POST -d "$RULE" "$BASE_URL/overrideRule" >/dev/null
      else
        FIRST_ID=$(echo "$EXISTING_IDS" | head -n1)
        echo "Updating anime movies override rule $FIRST_ID"
        api -X PUT -d "$RULE" "$BASE_URL/overrideRule/$FIRST_ID" >/dev/null

        echo "$EXISTING_IDS" | tail -n +2 | while IFS= read -r id; do
          echo "Deleting duplicate override rule $id"
          api -X DELETE "$BASE_URL/overrideRule/$id" >/dev/null
        done
      fi
    '';
  };
}
