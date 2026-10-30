{
  lib,
  catalog,
  ...
}: {
  networks =
    lib.mapAttrs (name: net: {
      inherit name;
      cidrv4 = net.cidr;
    })
    catalog.networks;
}
