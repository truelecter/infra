{
  config,
  inputs,
  pkgs,
  lib,
  ...
}: let
  secret = key: config.sops.secrets.${key}.path;

  seerr = pkgs.seerr.overrideAttrs (old: let
    nodejs-slim = pkgs.nodejs-slim_22;
    pnpm = pkgs.pnpm_10.override {inherit nodejs-slim;};

    src = pkgs.fetchFromGitHub {
      owner = "michaelhthomas";
      repo = "seerr";
      rev = "0bfd615c0dcd13b30b15bdf0aa98e23669f55cd2";
      sha256 = "sha256-YPpicQlArAqWnRbUbtUYlwTJk0AGxcaeQmaYNT0vogo=";
    };

    pname = "seerr";
    version = "preview-oidc-new";
  in {
    inherit src version;

    pnpmDeps = pkgs.fetchPnpmDeps {
      inherit pname version src pnpm;
      fetcherVersion = 3;
      hash = "sha256-7nBkeXGJfDRSvNesOjOK+Mtzp6SlBvbytyfsQl9eh/Y=";
    };
  });

  seerCfg = config.nixflix.seerr;

  providers = {
    slug = "kanidm";
    name = "Kanidm";
    issuerUrl = "https://auth.tlctr.me/oauth2/openid/seerr/.well-known/openid-configuration";
    clientId = "seerr";
    # clientSecret = secret "kanidm-oauth2-seerr";
    logo = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/kanidm.png";
    newUserLogin = true;
  };

  providersFile = pkgs.writeText "providers.json" (builtins.toJSON [providers]);
in {
  nixflix.seerr = {
    enable = true;

    package = seerr;

    apiKey._secret = secret "seerr-api-key";

    settings.users = {
      defaultPermissions = 160;
      localLogin = false;
      mediaServerLogin = true;
    };
  };

  systemd.services.seerr = {
    preStart = ''
      cp -f ${seerCfg.dataDir}/settings.json ${seerCfg.dataDir}/settings.json.pre || echo '{}' > ${seerCfg.dataDir}/settings.json.pre

      ${lib.getExe pkgs.jq} -n \
        --slurpfile settings ${seerCfg.dataDir}/settings.json.pre \
        --slurpfile providers ${providersFile} \
        --rawfile secret ${secret "seerr-kanidm-oauth2-secret"} \
        '($settings[0] // {})
          | .main.oidcLogin = true
          | .oidc.providers = $providers[0]
          | .oidc.providers[0].clientSecret = ($secret | rtrimstr("\n"))' > ${seerCfg.dataDir}/settings.json
    '';
  };

  sops.secrets = let
    sopsFile = "${inputs.self}/secrets/arr.yaml";

    mkSecret = key: {
      inherit sopsFile key;
    };
  in {
    seerr-api-key = mkSecret "seerr/api-key";

    seerr-kanidm-oauth2-secret = {
      key = "oauth2/basic/seerr";
      sopsFile = "${inputs.self}/secrets/kanidm.yaml";
      owner = config.nixflix.seerr.user;
    };
  };
}
