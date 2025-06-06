{config, ...}: let
  sCfg = config.tl.matrix;
in {
  sops.secrets = let
    sopsFile = ../../../../../secrets/matrix.yaml;
  in {
    coturn_auth_secret = {
      inherit sopsFile;
      mode = "0440";
      group = config.users.groups.turnserver.name;
    };
    synapse_turn_shared_secret = {
      inherit sopsFile;
      mode = "0440";
      group = config.users.groups.matrix-synapse.name;
    };
  };

  # Needed for access to SSL certificates from the turn server
  users.users.nginx.extraGroups = ["turnserver"];

  security.acme.certs = {
    ${sCfg.turn} = {
      postRun = "systemctl restart coturn.service";
      group = "turnserver";
    };
  };

  services.nginx.virtualHosts.${sCfg.turn} = {enableACME = true;};

  services.coturn = rec {
    enable = true;
    no-cli = true;
    no-tcp-relay = true;
    min-port = 49000;
    max-port = 50000;
    use-auth-secret = true;
    static-auth-secret-file = config.sops.secrets.coturn_auth_secret.path;
    realm = sCfg.turn;
    cert = "${config.security.acme.certs.${realm}.directory}/full.pem";
    pkey = "${config.security.acme.certs.${realm}.directory}/key.pem";
    extraConfig = ''
      # for debugging
      verbose
      # ban private IP ranges
      no-multicast-peers
      denied-peer-ip=0.0.0.0-0.255.255.255
      denied-peer-ip=10.0.0.0-10.255.255.255
      denied-peer-ip=100.64.0.0-100.127.255.255
      denied-peer-ip=127.0.0.0-127.255.255.255
      denied-peer-ip=169.254.0.0-169.254.255.255
      denied-peer-ip=172.16.0.0-172.31.255.255
      denied-peer-ip=192.0.0.0-192.0.0.255
      denied-peer-ip=192.0.2.0-192.0.2.255
      denied-peer-ip=192.88.99.0-192.88.99.255
      denied-peer-ip=192.168.0.0-192.168.255.255
      denied-peer-ip=198.18.0.0-198.19.255.255
      denied-peer-ip=198.51.100.0-198.51.100.255
      denied-peer-ip=203.0.113.0-203.0.113.255
      denied-peer-ip=240.0.0.0-255.255.255.255
      denied-peer-ip=::1
      denied-peer-ip=64:ff9b::-64:ff9b::ffff:ffff
      denied-peer-ip=::ffff:0.0.0.0-::ffff:255.255.255.255
      denied-peer-ip=100::-100::ffff:ffff:ffff:ffff
      denied-peer-ip=2001::-2001:1ff:ffff:ffff:ffff:ffff:ffff:ffff
      denied-peer-ip=2002::-2002:ffff:ffff:ffff:ffff:ffff:ffff:ffff
      denied-peer-ip=fc00::-fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff
      denied-peer-ip=fe80::-febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff
    '';
  };

  services.matrix-synapse = {
    extraConfigFiles = [
      config.sops.secrets.synapse_turn_shared_secret.path
    ];
    settings.turn_uris = [
      "turn:${config.services.coturn.realm}:3478?transport=udp"
      "turn:${config.services.coturn.realm}:3478?transport=tcp"
    ];
  };

  networking.firewall = {
    allowedTCPPorts = [3478 5349];
    allowedUDPPorts = [3478 5349];
    allowedUDPPortRanges = [
      {
        from = config.services.coturn.min-port;
        to = config.services.coturn.max-port;
      }
    ];
  };
}
