{
  pkgs,
  config,
  inputs,
  catalog,
  ...
}: let
  inherit (catalog.networks) wireguard x290;
  address = catalog.hosts.depsos.net.wireguard.ip;
  router = catalog.devices.x290-router;
in {
  networking = {
    nat = {
      enable = true;
      externalInterface = "eth0";
      internalInterfaces = ["wg0"];
    };
    firewall = {
      allowedUDPPorts = [25563];
    };
  };

  networking.wireguard.interfaces = {
    wg0 = {
      ips = ["${address}/${toString wireguard.prefixLength}"];
      listenPort = 25563;

      postSetup = ''
        ${pkgs.iptables}/bin/iptables -t nat -A POSTROUTING -s ${wireguard.cidr} -o eth0 -j MASQUERADE
      '';
      postShutdown = ''
        ${pkgs.iptables}/bin/iptables -t nat -D POSTROUTING -s ${wireguard.cidr} -o eth0 -j MASQUERADE
      '';

      privateKeyFile = config.sops.secrets.depsos-wg-pk.path;

      peers = [
        {
          publicKey = router.wireguard.publicKey;
          allowedIPs = [
            # Router
            "${router.net.wireguard.ip}/32"
            # Lan
            x290.cidr
          ];
        }
      ];
    };
  };

  topology.self.interfaces.wg0 = {
    addresses = [address];
    network = "wireguard";
    virtual = true;
    type = "wireguard";
  };

  sops.secrets.depsos-wg-pk = {
    key = "depsos-pk";
    sopsFile = "${inputs.self}/secrets/wireguard.yaml";
  };
}
