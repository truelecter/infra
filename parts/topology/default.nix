{
  self,
  lib,
  inputs,
  ...
}: {
  perSystem = {...}: {
    topology.modules = [
      ./routers.nix
      ./internet.nix
      ./networks.nix
    ];
  };
}
