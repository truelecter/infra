{
  networking.firewall.enable = false;
  networking.useDHCP = true;
  networking.useNetworkd = true;

  services.resolved.enable = true;

  systemd.network = {
    enable = true;
    wait-online.timeout = 0;
  };
}
