{config, ...}: let
  wifiInterface = "wifi-ext";
  wifiAPInterface = "wifi-ap";
  lanEth = "lan-eth";
in {
  networking.useDHCP = false;

  systemd.network = {
    enable = true;

    links = {
      "10-wifi-pci" = {
        linkConfig = {
          Name = wifiInterface;
        };

        matchConfig = {
          PermanentMACAddress = "a0:02:a5:89:d9:ba";
        };
      };

      "10-wifi-ext" = {
        linkConfig = {
          Name = wifiInterface;
        };

        matchConfig = {
          PermanentMACAddress = "00:c0:ca:b6:86:ff";
        };
      };

      "10-wifi-reserve" = {
        linkConfig = {
          Name = wifiInterface;
        };

        matchConfig = {
          PermanentMACAddress = "00:c0:ca:b6:73:ff";
        };
      };

      "10-wifi-reserve-rtl" = {
        linkConfig = {
          Name = wifiInterface;
        };

        matchConfig = {
          PermanentMACAddress = "c8:3a:35:ac:03:f0";
        };
      };

      "10-wifi-ap" = {
        linkConfig = {
          Name = wifiAPInterface;
        };

        matchConfig = {
          PermanentMACAddress = "a8:6e:84:da:99:37";
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

      "40-wifi-ap" = {
        matchConfig.Name = wifiAPInterface;
        address = [
          "10.3.0.161/27"
        ];
        networkConfig = {
          ConfigureWithoutCarrier = true;
        };
      };

      "40-lan-eth" = {
        matchConfig.Name = lanEth;
        address = [
          "10.3.0.129/27"
        ];
        networkConfig = {
          ConfigureWithoutCarrier = true;
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
    };
  };

  services.kea = {
    dhcp4 = {
      enable = true;
      settings = {
        interfaces-config = {
          interfaces = [
            wifiAPInterface
            lanEth
          ];
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
          # Voron
          {
            hw-address = "e4:5f:01:67:cc:6f";
            ip-address = "10.3.0.150";
          }

          # BBL
          {
            hw-address = "64:e8:33:77:71:b0";
            ip-address = "10.3.0.162";
          }

          # VZBot
          {
            hw-address = "d8:3a:dd:43:45:dc";
            ip-address = "10.3.0.131";
          }
        ];

        subnet4 = [
          {
            # Ethernet
            id = 1;
            pools = [
              {
                pool = "10.3.0.130 - 10.3.0.158";
              }
            ];

            interface = lanEth;

            option-data = [
              {
                code = 3;
                data = "10.3.0.129";
                name = "routers";
              }
            ];

            subnet = "10.3.0.128/27";
          }

          {
            # WiFi
            id = 2;
            pools = [
              {
                pool = "10.3.0.162 - 10.3.0.190";
              }
            ];

            option-data = [
              {
                code = 3;
                data = "10.3.0.161";
                name = "routers";
              }
            ];

            interface = wifiAPInterface;

            subnet = "10.3.0.160/27";
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
          capabilities = ["HT20/HT40"];
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
    systemdEscape = d: builtins.replaceStrings ["-"] ["\\x2d"] d;
    systemdNetdev = d: "sys-subsystem-net-devices-${systemdEscape d}.device";
  in {
    hostapd = {
      bindsTo = [(systemdNetdev wifiAPInterface)];
      after = [(systemdNetdev wifiAPInterface)];
    };
    kea-dhcp4-server = {
      bindsTo = [(systemdNetdev wifiAPInterface) (systemdNetdev lanEth)];
      after = [(systemdNetdev wifiAPInterface) (systemdNetdev lanEth)];
    };
  };

  systemd.network.wait-online.enable = false;
}
