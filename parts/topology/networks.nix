{config, ...}: {
  networks.x290 = {
    name = "x290";
    cidrv4 = "10.3.0.0/24";
  };

  networks.tailscale = {
    name = "tailscale";
    cidrv4 = "100.64.0.0/10";
  };
}
