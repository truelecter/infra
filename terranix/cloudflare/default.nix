# Cloudflare DNS records, one file per zone in ./zones. Each record keeps its
# Cloudflare id for the import block that adopts it into state. Records not
# listed are left alone: this isn't authoritative for the zones.
{
  lib,
  catalog,
  ...
}: let
  # Public addresses stay out of the repository, see `variable.public_ips`.
  publicIp = name: "\${var.public_ips.${name}}";

  zones = lib.mapAttrs' (file: _:
    lib.nameValuePair (lib.removeSuffix ".nix" file)
    (import ./zones/${file} {inherit catalog publicIp;}))
  (builtins.readDir ./zones);

  records = lib.concatLists (lib.mapAttrsToList (zone: z:
    lib.mapAttrsToList (key: record: {
      resource = "${lib.replaceStrings ["."] ["_"] zone}_${key}";
      zoneId = z.id;
      inherit record;
    })
    z.records)
  zones);
in {
  terraform.required_providers.cloudflare.source = "cloudflare/cloudflare";

  variable.public_ips = {
    type = "map(string)";
    sensitive = true;
    description = "Public IPv4 addresses by name, from secrets/terraform.yaml.";
  };

  resource.cloudflare_dns_record = lib.listToAttrs (map (r:
    lib.nameValuePair r.resource (removeAttrs r.record ["id"] // {zone_id = r.zoneId;}))
  records);

  import =
    map (r: {
      to = "cloudflare_dns_record.${r.resource}";
      id = "${r.zoneId}/${r.record.id}";
    })
    records;
}
