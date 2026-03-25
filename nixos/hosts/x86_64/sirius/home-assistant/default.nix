{...}: {
  imports = [
    ./z2m.nix
    ./hass
    ./mqtt.nix
    # ./matter.nix
    ./dns.nix
  ];

  systemd.tmpfiles.rules = [
    "d '/srv/home-assistant' 0775 root root - -"
  ];
}
