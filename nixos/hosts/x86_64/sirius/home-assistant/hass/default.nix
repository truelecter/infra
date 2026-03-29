let
  hass-version = "2026.3.3";
in {
  virtualisation.oci-containers = {
    containers.homeassistant = {
      volumes = [
        "/srv/home-assistant/hass:/config"
        "${./configs/dashboards}:/config/dashboards/"
      ];
      environment = {
        TZ = "Europe/Kyiv";
        # This is for HACS
        # PYTHONPATH = "/usr/local/lib/python3.12:/config/deps";
      };
      image = "ghcr.io/home-assistant/home-assistant:${hass-version}";
      extraOptions = ["--network=host"];
    };
  };

  systemd.tmpfiles.rules = [
    "d '/srv/home-assistant/hass' 0775 root root - -"
  ];

  # networking.firewall.interfaces.wg0.allowedTCPPorts = [8123];
  # networking.firewall.interfaces.wg0.allowedUDPPorts = [8123];
}
