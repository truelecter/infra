{
  networking = {
    firewall.enable = false;
    useDHCP = true;
    useNetworkd = true;
  };

  services.resolved.enable = true;

  systemd.network = {
    enable = true;
    wait-online.timeout = 0;
  };
}
