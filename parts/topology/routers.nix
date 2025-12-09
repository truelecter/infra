{config, ...}: let
  inherit (config.lib.topology) mkInternet mkRouter mkConnection mkSwitch;
in {
  nodes.x290-router = mkRouter "Mikrotik" {
    info = "Mikrotik hAP ax3";
    # image = ./images/fritzbox.png;
    interfaceGroups = [
      ["ether1"]
      [
        "bridge1"
        "ether3"
        # "ether3"
        # "ether4"
        # "ether5"
        # "wifi1"
        # "wifi2"
      ]
    ];
    interfaces.ether1 = {};

    interfaces.bridge1 = {
      addresses = ["10.3.0.1"];
      network = "x290";
    };
  };

  nodes.x290-switch = mkRouter "TP-Link" {
    info = "TP-Link AX1500";

    interfaceGroups = [
      [
        "wan"
        "lan1"
        # "lan2"
        # "lan3"
        "wifi"
      ]
    ];

    interfaces.wan = {
      addresses = ["10.3.0.20"];
      network = "x290";
    };

    interfaces.lan1 = {};

    connections.wan = mkConnection "x290-router" "ether3";

    connections.wifi = mkConnection "sirius" "wifi-ext";
  };

  nodes.x290-unifi = mkSwitch "USW Flex 2.5G" {
    info = "Ubiquty USW Flex 2.5G 8";
    interfaceGroups = [
      ["eth1" "eth2" "eth3" "eth4" "eth5" "eth6" "eth7" "eth8" "eth9"]
    ];

    connections.eth9 = mkConnection "sirius" "lan-eth";

    interfaces.eth9 = {
      addresses = ["10.3.0.130"];
      network = "x290";
    };
  };
}
