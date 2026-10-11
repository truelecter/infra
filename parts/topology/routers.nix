{config, ...}: let
  inherit (config.lib.topology) mkRouter mkConnection mkSwitch;
in {
  nodes = {
    x290-router = mkRouter "Mikrotik router" {
      info = "Mikrotik hAP ax3";
      interfaceGroups = [
        ["ether1"]
        [
          "bridge"
          "ether3"
          "wifi1"
          "wifi2"
        ]
      ];

      # WAN, DHCP from the ISP.
      interfaces.ether1.addresses = ["DHCP"];

      interfaces.bridge = {
        addresses = ["10.3.0.1"];
        network = "x290";
        virtual = true;
        type = "bridge";
      };

      # 5 GHz, SSID Xata290.5.
      interfaces.wifi1.type = "wifi";
      # 2.4 GHz, SSID Xata290.
      interfaces.wifi2.type = "wifi";

      connections.wifi1 = mkConnection "squadbook" "en0";
    };

    x290-ap = mkRouter "Mikrotik AP" {
      info = "Mikrotik hAP ax3";

      interfaceGroups = [
        [
          "bridge"
          "ether1"
          "wifi1"
          "wifi2"
        ]
      ];

      interfaces.bridge = {
        addresses = ["10.3.0.24"];
        network = "x290";
        virtual = true;
        type = "bridge";
      };

      # 5 GHz, SSID Xata290.5S: sirius' uplink (see sirius/wifi.nix).
      interfaces.wifi1.type = "wifi";
      # 2.4 GHz, SSID Xata290.2S.
      interfaces.wifi2.type = "wifi";

      connections = {
        ether1 = mkConnection "x290-router" "ether3";
        wifi1 = mkConnection "sirius" "wifi-ext";
      };
    };

    x290-unifi = mkSwitch "USW Flex 2.5G" {
      info = "Ubiquty USW Flex 2.5G 8";
      interfaceGroups = [
        ["eth1" "eth2" "eth3" "eth4" "eth5" "eth6" "eth7" "eth8" "eth9"]
      ];

      connections = {
        eth1 = mkConnection "tiny-m" "end0";
        eth7 = mkConnection "tl-mm4" "en0";
        eth8 = mkConnection "nas" "enp4s0";
        eth9 = mkConnection "sirius" "lan-eth";
      };

      interfaces.eth9 = {
        addresses = ["10.3.0.130"];
        network = "x290";
      };
    };

    tailscale = mkSwitch "Tailscale" {
      info = "Tailscale";
      deviceType = "internet";

      interfaces."*" = {
        network = "tailscale";
      };
    };
  };
}
