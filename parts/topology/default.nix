{
  self,
  lib,
  inputs,
  ...
}: {
  perSystem = {...}: {
    topology.modules = [
      {
        # extractors.nix-minecraft.enable = false;
      }
    ];
  };
}
