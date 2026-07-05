{
  config,
  inputs,
  ...
}: let
  inherit (inputs.nixflix.lib.jellyfinPlugins) fromRepo;
in {
  nixflix.jellyfin = {
    enable = true;
    apiKey._secret = config.sops.secrets."jellyfin-api-key".path;

    encoding = {
      allowHevcEncoding = true;
      allowAv1Encoding = true;

      enableDecodingColorDepth10Hevc = true;
      enableDecodingColorDepth10HevcRext = false;
      enableDecodingColorDepth12HevcRext = false;
      enableDecodingColorDepth10Vp9 = true;
      enableHardwareEncoding = true;

      hardwareAccelerationType = "nvenc";
      hardwareDecodingCodecs = ["h264" "vc1" "hevc" "av1" "mpeg2video"];
    };

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
      "SSO Authentication" = {
        enabled = true;
        url = "https://raw.githubusercontent.com/9p4/jellyfin-plugin-sso/6ad72eb9556f00b893035f56ace880acb1df641a/manifest.json";
        # nix store prefetch-file --json "https://raw.githubusercontent.com/9p4/jellyfin-plugin-sso/manifest-release/manifest.json" | jq -r .hash
        hash = "sha256-lX45HueVfT/xfIxkYn5eQobmVXBoi5jdpJCx43edRA0=";
      };
    };

    plugins."SSO Authentication" = {
      package = fromRepo {
        version = "4.0.0.4";
        # nix store prefetch-file --json --unpack https://github.com/9p4/jellyfin-plugin-sso/releases/download/v4.0.0.4/sso-authentication_4.0.0.4.zip | jq -r .hash
        hash = "sha256-MJTyE6CeVLk7mlugauJ/F6bpi1kYwNtzNmQeH3+CFeQ=";
      };

      apiName = "SSO-Auth";

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
