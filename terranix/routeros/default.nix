# The MikroTik units (catalog.devices.x290-router, x290-ap), through their
# REST APIs over HTTPS. <unit>.pem is the unit's self-signed `rest-api`
# certificate, pinned instead of trusting a CA. The root router is the default
# provider, the AP is `routeros.ap`.
{
  lib,
  catalog,
  ...
}: let
  units = {
    x290-router = {};
    x290-ap.alias = "ap";
  };

  key = lib.replaceStrings ["-"] ["_"];
  providerOf = u: lib.optionalAttrs (u ? alias) {provider = "routeros.${u.alias}";};

  # Services always exist: creating one only sets it (`numbers` names it).
  services = {
    www-ssl = {
      port = 443;
      certificate = "rest-api";
      tls_version = "only-1.2";
      disabled = false;
    };
    telnet = {
      port = 23;
      disabled = true;
    };
    ftp = {
      port = 21;
      disabled = true;
    };
  };

  perUnit = f: lib.concatMapAttrs f units;
in {
  imports = [
    ./dhcp.nix
    ./wifi.nix
  ];

  terraform.required_providers.routeros.source = "terraform-routeros/routeros";

  # The password comes from ROS_PASSWORD, set from secrets/terraform.yaml; it's
  # the same on every unit.
  provider.routeros = lib.mapAttrsToList (name: u:
    {
      hosturl = "https://${catalog.devices.${name}.net.x290.ip}";
      username = "admin";
      ca_certificate = "${./. + "/${name}.pem"}";
    }
    // lib.optionalAttrs (u ? alias) {inherit (u) alias;})
  units;

  resource = {
    routeros_system_identity = perUnit (name: u: {
      ${key name} = {inherit name;} // providerOf u;
    });

    routeros_ip_service = perUnit (name: u:
      lib.mapAttrs' (service: s:
        lib.nameValuePair "${key name}_${key service}" ({numbers = service;} // s // providerOf u))
      services);
  };
}
