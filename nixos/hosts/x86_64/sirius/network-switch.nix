{
  config,
  utils,
  catalog,
  ...
}: let
  wifiInterface = "wifi-ext";
  wifiAPInterface = "wifi-ap";
  lanEth = "lan-eth";
  bridge = "br-switch";

  inherit (catalog.networks) x290 x290-router x290-sirius;
  switchAddress = catalog.hosts.sirius.net.x290.ip;

  router = catalog.devices.x290-router.net.x290.ip;
in {
  networking.useDHCP = false;

  # mDNS is link-local: repeat it between the router's half and this one.
  services.avahi = {
    reflector = true;
    allowInterfaces = [wifiInterface bridge];
  };

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
              Destination = x290-router.cidr;
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
            # The router serves DHCP for this half too (terranix/routeros.nix).
            DHCPServer = true;
          };
          dhcpServerConfig.RelayTarget = router;
          routes = [
            {
              Destination = x290-sirius.cidr;
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
