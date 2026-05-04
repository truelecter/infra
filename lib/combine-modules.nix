{inputs, ...}: let
  haumea = inputs.haumea.lib;
in
  src: {
    imports = builtins.attrValues (
      haumea.load {
        inherit src;
        loader = haumea.loaders.path;
      }
    );
  }
