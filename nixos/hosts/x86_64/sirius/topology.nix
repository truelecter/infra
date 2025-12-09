{
  topology.self.name = "sirius";
  # topology.self.interfaces.br-switch = {
  #   addresses = ["10.3.0.129"];
  #   network = "br-switch";
  #   virtual = true;
  #   type = "bridge";
  # };

  topology = {
    networks.br-switch = {
      name = "Bridge network br-switch";
      cidrv4 = "10.3.0.128/25";
    };
  };
}
