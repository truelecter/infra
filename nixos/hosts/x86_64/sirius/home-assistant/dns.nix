{
  services.dnsmasq = {
    enable = true;
    resolveLocalQueries = false;
    settings = {
      bind-interfaces = true;
      except-interface = "lo";
      listen-address = "10.3.0.161";
      port = 53;
      server = ["10.3.0.1"];
      address = [
        # "/iot-south.acceleronix.io/10.3.0.161"
        "/local-mqtt.test/10.3.0.161"
      ];
    };
  };
}
