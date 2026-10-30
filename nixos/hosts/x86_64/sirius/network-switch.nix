{
  config,
  lib,
  utils,
  catalog,
  ...
}: let
  wifiInterface = "wifi-ext";
  wifiAPInterface = "wifi-ap";
  lanEth = "lan-eth";
  bridge = "br-switch";

  x290 = catalog.networks.x290;
  switchAddress = catalog.hosts.sirius.net.x290.ip;

  dnsOption = servers: {
    code = 6;
    name = "domain-name-servers";
    data = lib.concatStringsSep ", " servers;
  };

  # Every catalog host and device with an x290 address and MAC, by address.
  reservations = lib.pipe (catalog.hosts // catalog.devices) [
    lib.attrValues
    (lib.concatMap (node: lib.optional (node.net ? x290) node.net.x290))
    (lib.filter (a: a.ip != null && a.mac != null))
    (lib.sort (a: b: let
      octets = ip: map lib.toInt (lib.splitString "." ip);
    in
      lib.compareLists lib.compare (octets a.ip) (octets b.ip) < 0))
    (map (a:
      {
        hw-address = a.mac;
        ip-address = a.ip;
      }
      // lib.optionalAttrs (a.dhcp.nameservers != []) {
        option-data = [(dnsOption a.dhcp.nameservers)];
      }))
  ];
in {
  networking.useDHCP = false;

  systemd = {
    network = {
      enable = true;

      wait-online.enable = false;

      netdevs = {
        "10-${bridge}" = {
          netdevConfig = {
            Kind = "bridge";
            Name = bridge;
          };
        };
      };

      links = {
        "10-wifi-ext" = {
          linkConfig = {
            Name = wifiInterface;
          };

          matchConfig = {
            PermanentMACAddress = [
              "a0:02:a5:89:d9:ba" # Intel AX210
              "2c:98:11:a2:0b:95" # QCNCM865
              "14:ac:60:f9:f1:d9" # MT7927
            ];
          };
        };

        "10-wifi-ap" = {
          linkConfig = {
            Name = wifiAPInterface;
          };

          matchConfig = {
            PermanentMACAddress = [
              "1c:79:2d:f9:92:d8" # RTL8852BE

              # External USB Dongles
              "00:c0:ca:b6:86:ff" # TPLink
              "00:c0:ca:b6:73:ff" # Alfa AWUS036ACH
              "c8:3a:35:ac:03:f0" # Alfa AWUS036AXM
            ];
          };
        };

        "10-lan-eth" = {
          linkConfig = {
            Name = lanEth;
          };

          matchConfig = {
            PermanentMACAddress = "e0:51:d8:1a:7a:87";
          };
        };
      };

      networks = {
        "40-wifi" = {
          matchConfig.Name = wifiInterface;

          networkConfig = {
            DHCP = "ipv4";
            DNSOverTLS = false;
            DNSSEC = false;
          };

          networkConfig.LinkLocalAddressing = "no";
          # make routing on this interface a dependency for network-online.target
          linkConfig.RequiredForOnline = "routable";

          routes = [
            {
              Destination = "10.3.0.0/25";
            }
          ];
        };

        "10-br-switch" = {
          matchConfig.Name = bridge;
          address = [
            "${switchAddress}/${toString x290.prefixLength}"
          ];
          networkConfig = {
            ConfigureWithoutCarrier = true;
          };
          routes = [
            {
              Destination = "10.3.0.128/25";
            }
          ];
        };

        "40-wifi-ap" = {
          matchConfig.Name = wifiAPInterface;
          networkConfig = {
            ConfigureWithoutCarrier = true;
            Bridge = bridge;
          };
        };

        "40-lan-eth" = {
          matchConfig.Name = lanEth;
          networkConfig = {
            ConfigureWithoutCarrier = true;
            Bridge = bridge;
          };
        };
      };
    };

    services = let
      systemdNetdev = d: "sys-subsystem-net-devices-${utils.escapeSystemdPath d}.device";
    in {
      hostapd = {
        wantedBy = [
          (systemdNetdev wifiAPInterface)
          "network.target"
        ];
        before = [
          "network-pre.target"
        ];
        wants = [
          "network-pre.target"
          "systemd-modules-load.service"
        ];
        after = [
          "systemd-modules-load.service"
          "local-fs.target"
        ];
      };
      kea-dhcp4-server = {
        wantedBy = [(systemdNetdev wifiAPInterface) (systemdNetdev lanEth)];
      };
    };
  };

  boot.kernel = {
    sysctl = {
      "net.ipv4.conf.all.forwarding" = true;
      "net.ipv4.conf.all.proxy_arp" = true;
      "net.ipv4.conf.all.rp_filter" = false;
      "net.ipv4.conf.${wifiInterface}.rp_filter" = false;
      "net.ipv4.conf.${wifiAPInterface}.rp_filter" = false;
      "net.ipv4.conf.${lanEth}.rp_filter" = false;
      "net.ipv4.conf.${bridge}.rp_filter" = false;
    };
  };

  services = {
    kea = {
      dhcp4 = {
        enable = true;
        settings = {
          interfaces-config = {
            interfaces = [
              bridge
            ];
            service-sockets-require-all = true;
          };
          lease-database = {
            name = "/var/lib/kea/dhcp4.leases";
            persist = true;
            type = "memfile";
          };
          rebind-timer = 2000;
          renew-timer = 1000;

          host-reservation-identifiers = [
            "hw-address"
          ];

          reservations-global = true;
          reservations-in-subnet = true;

          option-data = [(dnsOption x290.nameservers)];

          inherit reservations;

          subnet4 = [
            {
              # Bridge
              id = 1;
              pools = [
                {
                  pool = "10.3.0.200 - 10.3.0.225";
                }
              ];

              interface = bridge;

              option-data = [
                {
                  code = 3;
                  data = switchAddress;
                  name = "routers";
                }
              ];

              subnet = "${switchAddress}/${toString x290.prefixLength}";
            }
          ];
          valid-lifetime = 4000;
        };
      };
    };

    hostapd = {
      enable = true;
      radios = {
        # 2.4GHz
        ${wifiAPInterface} = {
          band = "2g";
          noScan = true;
          channel = 6;
          countryCode = "UA";
          wifi4 = {
            enable = true;
            capabilities = ["[HT20/HT40][LDPC][HT40+][HT40-][SHORT-GI-20][SHORT-GI-40][TX-STBC][RX-STBC1][MAX-AMSDU-7935][DSSS_CCK-40]"];
          };
          networks = {
            ${wifiAPInterface} = {
              ssid = "Xata290.2";
              authentication = {
                wpaPasswordFile = config.sops.secrets.xata-password.path;
                mode = "wpa2-sha256";
              };
            };
          };
        };
      };
    };
  };
}
