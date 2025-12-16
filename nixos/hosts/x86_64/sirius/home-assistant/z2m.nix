{
  pkgs,
  lib,
  config,
  ...
}: {
  services.zigbee2mqtt = {
    enable = true;
    dataDir = "/srv/home-assistant/zigbee2mqtt";
    settings = {
      version = 4;
      # Home Assistant integration (MQTT discovery)
      homeassistant = {
        enabled = lib.mkForce true;
      };

      # MQTT settings
      mqtt = {
        # MQTT base topic for zigbee2mqtt MQTT messages
        base_topic = "zigbee2mqtt";
        # MQTT server URL
        server = "mqtt://127.0.0.1:1883";
      };

      # Serial settings
      serial = {
        port = "/dev/serial/by-id/usb-ITEAD_SONOFF_Zigbee_3.0_USB_Dongle_Plus_V2_20231218134945-if00";
        adapter = "ember";
      };

      advanced = {
        log_output = ["console"];
        log_level = "warning";
        pan_id = 1337;
        # add last seen information
        last_seen = "ISO_8601_local";
      };

      # configure web ui
      frontend = {
        enabled = true;
        port = 9666;
        host = "0.0.0.0";
      };
    };
  };
}
