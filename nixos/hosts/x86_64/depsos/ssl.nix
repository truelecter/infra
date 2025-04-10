{config, ...}: {
  security.acme = {
    acceptTerms = true;
    defaults = {
      email = "andrew.panassiouk@gmail.com";
      credentialsFile = config.sops.secrets.cloudflare.path;
      dnsProvider = "cloudflare";
    };
  };

  services.nginx = {
    recommendedOptimisation = true;
    recommendedProxySettings = true;
    recommendedTlsSettings = true;
    recommendedGzipSettings = true;
  };

  users.groups.acme.members = ["nginx"];

  sops.secrets.cloudflare = {
    sopsFile = ../../../../secrets/cloudflare.env;
    key = "";
    format = "dotenv";
  };
}
