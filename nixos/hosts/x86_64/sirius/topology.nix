{config, ...}: let
  inherit (config.services.kea.dhcp4) settings;
  inherit (builtins) concatStringsSep head length map;
in {
  topology.self = {
    # br-switch is the homelab segment of x290, not a separate network: same
    # subnet, but its own DHCP server.
    interfaces.br-switch.network = "x290";

    services.kea-dhcp4 = {
      name = "Kea DHCP";
      info = concatStringsSep ", " settings.interfaces-config.interfaces;
      details = {
        pool.text = concatStringsSep ", " (map (p: p.pool) (head settings.subnet4).pools);
        reservations.text = toString (length settings.reservations);
      };
    };
  };
}
