{
  lib,
  catalog,
  ...
}: {
  # Scopes of a network (catalog `subnetOf`) are part of their parent here.
  networks =
    lib.mapAttrs (name: net: {
      inherit name;
      cidrv4 = net.cidr;
    })
    (lib.filterAttrs (_: net: net.subnetOf == null) catalog.networks);
}
