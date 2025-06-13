# https://nixos.org/manual/nixos/stable/index.html#module-services-matrix
{
  config,
  pkgs,
  ...
}: let
  sCfg = config.tl.matrix;
in {
  services.nginx.virtualHosts.${sCfg.ui} = {
    enableACME = true;
    forceSSL = true;

    root = pkgs.element-web.override {
      conf = {
        default_server_config = {"m.homeserver".base_url = "https://${sCfg.homeserver-hostname}";};
      };
    };
  };
}
