{
  inputs,
  lib,
}:
lib.makeExtensible (
  _: let
    limp = p: import p {inherit inputs lib;};
  in {
    rakeLeaves = limp ./rake-leaves.nix;

    buildSuites = profiles: f: lib.mapAttrs (_: lib.flatten) (lib.fix (f profiles));

    haumea.transformers.defaultAsRoot = _: mod: mod.default or mod;

    importPackages = limp ./import-packages.nix;

    combineModules = limp ./combine-modules.nix;

    merge = attrs: builtins.foldl' (a: b: a // b) {} attrs;

    isLinux = system: builtins.match ".+-linux" system != null;
    isDarwin = system: builtins.match ".+-darwin" system != null;

    importAttrOrFunction = path: arg: let
      r = import path;
    in
      if builtins.isFunction r
      then r arg
      else r;
  }
)
