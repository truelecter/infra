{
  config,
  inputs,
  lib,
  ...
}: {
  # Prefer DNS-01 challenges over HTTP-01
  # See https://github.com/NixOS/nixpkgs/issues/210807 for this hack explanation
  options.services.nginx.virtualHosts = lib.mkOption {
    type = lib.types.attrsOf (lib.types.submodule {
      config.acmeRoot = lib.mkDefault null;
    });
  };

  config = {
    security.acme = {
      acceptTerms = true;
      defaults = {
        email = "andrew.panassiouk@gmail.com";
        environmentFile = config.sops.secrets.cloudflare.path;
        dnsProvider = "cloudflare";
      };
    };

    services.nginx = {
      recommendedTlsSettings = true;
    };

    users.groups.acme.members = ["nginx"];

    sops.secrets.cloudflare = {
      sopsFile = "${inputs.self}/secrets/cloudflare.env";
      key = "";
      format = "dotenv";
    };
  };
}
