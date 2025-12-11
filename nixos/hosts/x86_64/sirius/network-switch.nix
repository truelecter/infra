{
  config,
  utils,
  ...
}: let
  wifiInterface = "wifi-ext";
  wifiAPInterface = "wifi-ap";
  lanEth = "lan-eth";
  bridge = "br-switch";

  switchAddress = "10.3.0.129";
in {
  networking.useDHCP = false;

  systemd.network = {
    enable = true;

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
          PermanentMACAddress = "a0:02:a5:89:d9:ba";
        };
      };

      # External USB Dongles
      # TPLink 00:c0:ca:b6:86:ff
      # Alfa AWUS036ACH 00:c0:ca:b6:73:ff
      # Alfa AWUS036AXM c8:3a:35:ac:03:f0

      "10-wifi-ap" = {
        linkConfig = {
          Name = wifiAPInterface;
        };

        matchConfig = {
          PermanentMACAddress = "1c:79:2d:f9:92:d8";
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
      };

      "10-br-switch" = {
        matchConfig.Name = bridge;
        address = [
          "${switchAddress}/25"
        ];
        networkConfig = {
          ConfigureWithoutCarrier = true;
        };
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

  services.kea = {
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

        option-data = [
          {
            code = 6;
            data = "10.3.0.1";
            name = "domain-name-servers";
          }
        ];

        reservations = [
          # USW Flex 2.5G 8
          {
            hw-address = "94:2a:6f:4e:e0:20";
            ip-address = "10.3.0.130";
          }

          # NAS
          {
            hw-address = "f4:b5:20:45:4d:2e";
            ip-address = "10.3.0.132";
          }

          # tl-mm4
          {
            hw-address = "d0:11:e5:83:d8:9e";
            ip-address = "10.3.0.133";
          }

          # Voron
          {
            hw-address = "e4:5f:01:67:cc:6f";
            ip-address = "10.3.0.150";
          }

          # Tiny-M
          {
            hw-address = "dc:a6:32:ff:8c:18";
            ip-address = "10.3.0.151";
          }

          # BBL
          {
            hw-address = "64:e8:33:77:71:b0";
            ip-address = "10.3.0.152";
          }

          # VZBot
          {
            hw-address = "d8:3a:dd:43:45:dc";
            ip-address = "10.3.0.153";
          }

          # IoT
          # Oukitel BP2000
          {
            hw-address = "74:07:7e:67:6c:30";
            ip-address = "10.3.0.180";

            option-data = [
              {
                code = 6;
                name = "domain-name-servers";
                data = switchAddress;
              }
            ];
          }
        ];

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

            subnet = "${switchAddress}/25";
          }
        ];
        valid-lifetime = 4000;
      };
    };
  };

  services.hostapd = {
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

  systemd.services = let
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

  systemd.network.wait-online.enable = false;
}
