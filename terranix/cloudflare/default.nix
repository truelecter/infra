# Not authoritative: records not listed here are left alone.
{
  lib,
  catalog,
  ...
}: let
  # Public addresses stay out of the repository, see `variable.public_ips`.
  publicIp = name: "\${var.public_ips.${name}}";

  nodes = catalog.hosts // catalog.devices;

  # At the public IP of the host or device the service is reached through, or
  # at its home LAN address.
  serviceRecords = zone:
    lib.mapAttrs' (_: s:
      lib.nameValuePair "a_${lib.replaceStrings ["-"] ["_"] s.subdomain}" ({
          type = "A";
          name = s.fqdn;
          ttl = 1;
        }
        // (
          if s.public
          then {
            content = publicIp s.via;
            proxied = true;
          }
          else {content = nodes.${s.via}.net.x290.ip;}
        )))
    (lib.filterAttrs (_: s: s.domain == zone) catalog.services);

  zones = lib.mapAttrs' (file: _: let
    zone = lib.removeSuffix ".nix" file;
    z = import ./zones/${file} {inherit catalog publicIp;};
    services = serviceRecords zone;
    clashes = lib.attrNames (lib.intersectAttrs services z.records);
  in
    lib.nameValuePair zone (z
      // {
        records =
          lib.throwIf (clashes != []) "${file}: ${lib.concatStringsSep ", " clashes} also come from catalog.services"
          (services // z.records);
      }))
  (builtins.readDir ./zones);

  records = lib.concatLists (lib.mapAttrsToList (zone: z:
    lib.mapAttrsToList (key: record: {
      resource = "${lib.replaceStrings ["."] ["_"] zone}_${key}";
      zoneId = z.id;
      inherit record;
    })
    z.records)
  zones);

  # Zones with `tieredCache = true`: Tiered Cache with the Smart topology.
  tiered = lib.mapAttrs' (zone: z: lib.nameValuePair (lib.replaceStrings ["."] ["_"] zone) {zone_id = z.id;}) (lib.filterAttrs (_: z: z.tieredCache or false) zones);
in {
  terraform.required_providers.cloudflare.source = "cloudflare/cloudflare";

  variable.public_ips = {
    type = "map(string)";
    sensitive = true;
    description = "Public IPv4 addresses by name, from secrets/terraform.yaml.";
  };

  resource = {
    cloudflare_dns_record = lib.listToAttrs (map (r:
      lib.nameValuePair r.resource (r.record // {zone_id = r.zoneId;}))
    records);

    cloudflare_argo_tiered_caching = lib.mapAttrs (_: z: z // {value = "on";}) tiered;
    cloudflare_tiered_cache = lib.mapAttrs (_: z: z // {value = "on";}) tiered;
  };
}
