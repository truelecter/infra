{
  pkgs,
  config,
  ...
}: {
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
      ips = ["10.7.0.1/24"];
      listenPort = 25563;

      postSetup = ''
        ${pkgs.iptables}/bin/iptables -t nat -A POSTROUTING -s 10.7.0.0/24 -o eth0 -j MASQUERADE
      '';
      postShutdown = ''
        ${pkgs.iptables}/bin/iptables -t nat -D POSTROUTING -s 10.7.0.0/24 -o eth0 -j MASQUERADE
      '';

      # public: BTc6Jjt1kcfPmI+0YH+XwiOFXifEz6LN4NqLxQJK/Qs=
      privateKeyFile = config.sops.secrets.depsos-wg-pk.path;

      peers = [
        {
          publicKey = "RkWLn9HW/dIm1mJuXNWJgPzDwrE88qBJ10cgCVBosQU=";
          allowedIPs = [
            # Router
            "10.7.0.3/32"
            # Lan
            "10.3.0.0/24"
          ];
        }
      ];
    };
  };

  sops.secrets.depsos-wg-pk = {
    key = "depsos-pk";
    sopsFile = ../../../../../secrets/wireguard.yaml;
  };
}
