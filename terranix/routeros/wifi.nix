{
  lib,
  catalog,
  ...
}: let
  router = catalog.devices.x290-router.net.x290.ip;
  ap = {provider = "routeros.ap";};

  country = "Ukraine";
  ssids = {
    "5" = "Xata290.5";
    "2" = "Xata290";
  };

  # Radios by unit and band; CAPsMAN provisions the AP's by MAC.
  radios = {
    x290-router = {
      "5" = {};
      "2" = {};
    };
    x290-ap = {
      "5".mac = "78:9A:18:3A:85:11";
      "2".mac = "78:9A:18:3A:85:12";
    };
  };

  key = lib.replaceStrings ["-"] ["_"];
  profile = unit: band: "${unit}-${band}";

  # Each unit keeps its current radio settings.
  extra = {
    x290-router = {};
    x290-ap = {
      chains = [0 1];
      dtim_period = 3;
    };
  };
  channel = unit: band:
    if band == "2"
    then "2ghz"
    else if unit == "x290-ap"
    then "5ghz-ap"
    else "5ghz";

  ifname = band:
    if band == "5"
    then "wifi1"
    else "wifi2";

  forRadios = f: lib.concatMapAttrs (unit: bands: lib.concatMapAttrs (band: r: f unit band r) bands) radios;
in {
  variable.wifi_passphrase = {
    type = "string";
    sensitive = true;
    description = "Passphrase of the x290 networks, from secrets/wifi.yaml.";
  };

  resource = {
    routeros_wifi_security.xata = {
      name = "xata";
      authentication_types = ["wpa2-psk" "wpa3-psk"];
      passphrase = "\${var.wifi_passphrase}";
      # 802.11r, to roam between the router and the AP.
      ft = true;
      ft_over_ds = true;
    };

    routeros_wifi_channel = {
      ch_5ghz = {
        name = "5ghz";
        skip_dfs_channels = "all";
        width = "20/40/80mhz";
      };
      ch_5ghz_ap = {
        name = "5ghz-ap";
        skip_dfs_channels = "all";
        width = "20/40/80mhz";
        frequency = ["5180"];
      };
      ch_2ghz = {
        name = "2ghz";
        skip_dfs_channels = "all";
      };
    };

    routeros_wifi_configuration = forRadios (unit: band: _: {
      ${key (profile unit band)} =
        {
          name = profile unit band;
          ssid = ssids.${band};
          inherit country;
          mode = "ap";
          security.config = "\${routeros_wifi_security.xata.name}";
          channel.config = "\${routeros_wifi_channel.ch_${key (channel unit band)}.name}";
        }
        // extra.${unit};
    });

    routeros_wifi_capsman.settings = {
      enabled = true;
      interfaces = ["bridge"];
      # The AP runs a newer RouterOS than the router's long-term branch.
      upgrade_policy = "none";
    };

    routeros_wifi_provisioning = lib.mapAttrs' (band: r:
      lib.nameValuePair "x290_ap_${band}" {
        action = "create-dynamic-enabled";
        radio_mac = r.mac;
        master_configuration = "\${routeros_wifi_configuration.${key (profile "x290-ap" band)}.name}";
        comment = "x290-ap";
      })
    radios.x290-ap;

    # The router's radios use their profile locally, since CAPsMAN can't manage
    # the radios of the unit it runs on; the AP's take theirs from CAPsMAN.
    routeros_wifi = forRadios (unit: band: _: {
      "${key unit}_${band}" =
        {name = ifname band;}
        // (
          if unit == "x290-router"
          then {configuration.config = "\${routeros_wifi_configuration.${key (profile unit band)}.name}";}
          else
            {
              configuration.manager = "capsman";
              datapath.config = "\${routeros_wifi_datapath.x290_ap.name}";
            }
            // ap
        );
    });

    routeros_wifi_datapath.x290_ap =
      {
        name = "capdp";
        bridge = "bridge";
      }
      // ap;

    routeros_wifi_cap.x290_ap =
      {
        enabled = true;
        discovery_interfaces = ["bridge"];
        caps_man_addresses = [router];
        slaves_datapath = "\${routeros_wifi_datapath.x290_ap.name}";
      }
      // ap;
  };
}
