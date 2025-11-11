{
  inputs,
  lib,
}: let
  haumea = inputs.haumea.lib;
in
  {
    nixpkgs,
    sources ? null,
    extraArguments ? {},
    packages,
  }: let
    sources' =
      if builtins.isPath sources
      then (nixpkgs.callPackage sources {})
      else sources;
  in
    lib.mapAttrs (
      _: v: nixpkgs.callPackage v (extraArguments // {sources = sources';})
    )
    (
      haumea.load {
        src = packages;
        loader = haumea.loaders.path;
        transformer = _cursor: dir: dir.default or dir;
      }
    )
