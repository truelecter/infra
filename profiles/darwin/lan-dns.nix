# `<node>.xata` from the router even when other resolvers come first.
{
  lib,
  catalog,
  ...
}: let
  inherit (catalog.networks) x290;
in {
  environment.etc."resolver/${x290.domain}".text = lib.concatMapStrings (ns: "nameserver ${ns}\n") x290.nameservers;
}
