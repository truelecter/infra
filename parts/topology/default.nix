{
  self,
  lib,
  inputs,
  ...
}: {
  perSystem = _: {
    topology.modules = [
      ./routers.nix
      ./internet.nix
      ./networks.nix
    ];
  };
}
