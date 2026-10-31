{
  config,
  inputs,
  lib,
  pkgs,
  ...
}: let
  inherit (inputs.nixflix.lib.jellyfinPlugins) fromRepo;

  # nixflix strips only one trailing ".0" from plugin targetAbi ("12.0.0.0" ->
  # "12.0.0") and then version-compares it to pkgs.jellyfin.version ("12.0").
  # Nix treats 12.0 as older than 12.0.0, so every Jellyfin 12 plugin looks
  # incompatible. Pad to three components so fromRepo can resolve.
  jellyfinAbiVersion = let
    parts = lib.splitVersion pkgs.jellyfin.version;
    padded = parts ++ lib.genList (_: "0") (3 - builtins.length parts);
  in
    lib.concatStringsSep "." (lib.take 3 padded);
in {
  nixflix.jellyfin = {
    enable = true;
    package = pkgs.jellyfin // {version = jellyfinAbiVersion;};
    apiKey._secret = config.sops.secrets."jellyfin-api-key".path;

    encoding = {
      allowHevcEncoding = true;

      enableDecodingColorDepth10Hevc = true;
      enableDecodingColorDepth10HevcRext = false;
      enableDecodingColorDepth12HevcRext = false;
      enableDecodingColorDepth10Vp9 = true;
      enableHardwareEncoding = true;

      # GTX 1660 Super (TU116): NVDEC has no AV1, NVENC has no AV1
      hardwareAccelerationType = "nvenc";
      hardwareDecodingCodecs = ["h264" "vc1" "hevc" "vp9" "mpeg2video"];

      # HDR -> SDR via tonemap_cuda; without it HDR transcodes are only relabeled bt709
      enableTonemapping = true;
    };

    # Metadata lives only in Jellyfin's database. The arr apps create media
    # folders as 755, so writes next to the media fail anyway.
    libraries = lib.genAttrs ["Shows" "Movies" "Anime" "Anime Movies"] (name: {
      saveLocalMetadata = false;

      # Movie libraries group films into their TMDb collections (Harry Potter,
      # Twilight). TMDb has no TV collections; Auto Collections below covers shows.
      automaticallyAddToCollection = lib.elem name ["Movies" "Anime Movies"];
    });

    branding = {
      loginDisclaimer = ''
        <a href="https://jellyfin.xata.house/sso/OID/start/kanidm" class="raised cancel block emby-button authelia-sso button-submit">
          <img src="https://kanidm.com/images/logo.svg" alt="Kanidm" class="sso-icon">
          Signin with Kanidm
        </a>
      '';

      customCss = ''
        ${
          if config.nixflix.theme.enable
          then ''@import url("https://theme-park.dev/css/base/jellyfin/$${config.nixflix.theme.name}.css");''
          else ""
        }

        /* Make links look like buttons */
        a.raised.emby-button {
          padding: 0.9em 1em;
          color: inherit !important;
        }

        /* Let disclaimer take full width */
        .disclaimerContainer {
          display: block;
        }

        .sso-icon {
          width: 25px;
          height: 25px;
          vertical-align: middle;
          margin-right: 5px;
        }

        .emby-button.block.btnForgotPassword {
          display: none;
        }

        .btnForgotPassword {
          display: none !important;
        }

        .loginDisclaimerContainer,
        .loginDisclaimer {
            all: unset;
        }
      '';
    };

    system.pluginRepositories = {
      "Jellyfin Universal Plugin Repo" = {
        enabled = true;
        # Snapshot of https://repo.jellyfin.org/files/plugin/manifest.json
        url = lib.mkForce "https://raw.githubusercontent.com/kiriwalawren/nixflix/d77a3861a6a8c1468b38f9f2b81cee2d6ae26c7b/modules/jellyfin/system/jellyfin-universal-plugin-manifest.json";
        hash = lib.mkForce "sha256-XcOdBwMClQy2LDY/vqLfGXvM6GqGoF5nxuH9DLtlQFA=";
      };

      "SSO-Auth" = {
        enabled = true;
        url = "https://raw.githubusercontent.com/Buco7854/jellyfin-plugin-sso/4ac0ec4c8afeb43918a31060e263c92c4bd5c2ec/manifest.json";
        # nix store prefetch-file --json "https://raw.githubusercontent.com/Buco7854/jellyfin-plugin-sso/4ac0ec4c8afeb43918a31060e263c92c4bd5c2ec/manifest.json" | jq -r .hash
        hash = "sha256-aucud5ZCB/Gk6sMpkDbMlr3yF9yOCmj3aBzDO5x2dhs=";
      };

      "Auto Collections" = {
        enabled = true;
        url = "https://raw.githubusercontent.com/KeksBombe/jellyfin-plugin-auto-collections/4630c2c9107bcc60de7d320e051bf2b5be13a21c/manifest.json";
        # nix store prefetch-file --json "https://raw.githubusercontent.com/KeksBombe/jellyfin-plugin-auto-collections/4630c2c9107bcc60de7d320e051bf2b5be13a21c/manifest.json" | jq -r .hash
        hash = "sha256-COTY7wkssUqT2/i61cjmlzK3c3fdBseuLwJPhCYDQDY=";
      };
    };

    plugins."SSO-Auth" = {
      package = fromRepo {
        version = "5.0.0.2";
        # nix store prefetch-file --json --unpack https://github.com/Buco7854/jellyfin-plugin-sso/releases/download/v5.0.0.2/sso-auth_5.0.0.2.zip | jq -r .hash
        hash = "sha256-p6vdHnzPocdVVRJzmM0cNzG1meyRfS0Z3pWUBghd4xE=";
        repository = "SSO-Auth";
      };

      config = {
        OidConfigs = let
          kanidmDomain = "auth.tlctr.me";
        in {
          kanidm = {
            SchemeOverride = "https";
            OidEndpoint = "https://${kanidmDomain}/oauth2/openid/jellyfin/";
            OidClientId = "jellyfin";
            OidSecret._secret = config.sops.secrets.jellyfin-kanidm-oauth2-secret.path;
            Enabled = true;
            EnableAuthorization = true;
            EnableAllFolders = true;
            EnabledFolders = [];
            AdminRoles = ["media.admins@${kanidmDomain}"];
            Roles = [
              "media.access@${kanidmDomain}"
              "media.admins@${kanidmDomain}"
            ];
            EnableFolderRoles = false;
            EnableLiveTvRoles = false;
            EnableLiveTv = false;
            EnableLiveTvManagement = false;
            LiveTvRoles = [];
            LiveTvManagementRoles = [];
            FolderRoleMapping = [];
            RoleClaim = "groups";
            OidScopes = ["groups"];
            NewPath = false;
            CanonicalLinks = {};
            DefaultUsernameClaim = "preferred_username";
            DisableHttps = false;
            DisablePushedAuthorization = false;
            DoNotValidateEndpoints = false;
            DoNotValidateIssuerName = false;
            DoNotLoadProfile = false;
          };
        };
      };
    };

    plugins.AniDB.enable = true;
    plugins.AniDB.package = fromRepo {
      version = "13.0.0.0";
      # nix store prefetch-file --json --unpack https://repo.jellyfin.org/files/plugin/anidb/anidb_13.0.0.0.zip | jq -r .hash
      hash = "sha256-TiMl1kloW43CpKrLGaU9uZxrHi/oZHTA8Eu7MsRDneM=";
    };

    # Collections for show franchises, one rule each. Rules removed here
    # delete their collection on the next sync.
    plugins."Auto Collections" = {
      enable = true;
      # nixflix's bundled hash comes from libarchive unpacking. fetchzip unzips
      # this FAT-attribute archive to different bytes on Linux, so pin the hash
      # the builder actually produces.
      package = fromRepo {
        version = "0.0.9.0";
        hash = "sha256-kDievxhfko7q+uWsRnz8V4yzqPaeDf+Go1kMWyWtg1M=";
        repository = "Auto Collections";
      };
      config = let
        collection = name: expression: {
          CollectionName = name;
          Expression = expression;
          CaseSensitive = false;
          SortBy = "ReleaseYear";
          SortOrder = "Ascending";
        };
      in {
        # Skips the example collections the plugin seeds on first start.
        IsInitialized = true;
        DeleteOrphanedCollections = true;
        TitleMatchPairs = [];
        ExpressionCollections = [
          (collection "Planet Earth" ''SHOW AND TITLE "Planet Earth" AND STUDIO "BBC"'')
          (collection "Breaking Bad" ''TITLE "Breaking Bad" OR TITLE "Better Call Saul"'')
        ];
      };
    };
  };

  sops.secrets = {
    jellyfin-kanidm-oauth2-secret = {
      key = "oauth2/basic/jellyfin";
      sopsFile = "${inputs.self}/secrets/kanidm.yaml";
    };

    jellyfin-api-key = {
      key = "jellyfin/api-key";
      sopsFile = "${inputs.self}/secrets/arr.yaml";
    };
  };
}
