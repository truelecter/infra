{config, ...}: let
  klipperCfg = config.tl.services.klipper;
in {
  services.moonraker = {
    enable = true;
    address = "0.0.0.0";
    allowSystemControl = true;

    inherit (klipperCfg) user group;

    settings = {
      server = {
        max_upload_size = 1024;
      };

      file_manager = {
        enable_object_processing = false;
      };

      octoprint_compat = {};
      history = {};

      machine.validate_service = false;

      authorization = {
        cors_domains = [
          "https://my.mainsail.xyz"
          "http://my.mainsail.xyz"
          "http://*.local"
          "http://*.lan"
          "http://tiny-m"
        ];

        trusted_clients = [
          "100.0.0.0/8"
          "10.0.0.0/8"
          "127.0.0.0/8"
          "169.254.0.0/16"
          "172.16.0.0/12"
          "192.168.0.0/16"
          "FE80::/10"
          "::1/128"
        ];
      };
    };
  };

  security.polkit.enable = true;

  tl.services.mobileraker-companion.enable = true;
}
