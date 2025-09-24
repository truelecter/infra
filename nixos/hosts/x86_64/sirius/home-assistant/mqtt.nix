{
  services.mosquitto = {
    enable = true;
    dataDir = "/srv/home-assistant/mosquitto";
    listeners = [
      {
        acl = ["pattern readwrite #"];
        omitPasswordAuth = true;
        settings.allow_anonymous = true;
      }
    ];
  };

  # open for tasmota
  # networking.firewall.interfaces.enp0s31f6.allowedTCPPorts = [1883];
  # networking.firewall.interfaces.wg0.allowedTCPPorts = [1883];
}
