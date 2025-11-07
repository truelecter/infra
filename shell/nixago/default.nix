{
  self,
  lib,
  inputs,
  ...
}: {
  perSystem = {
    config,
    system,
    inputs',
    pkgs,
    ...
  }: let
    nixago = inputs.nixago.lib.${system};
    engines = inputs.nixago.engines.${system};

    nixago-exts = lib.pipe ["conform" "ghsettings"] [
      (builtins.map (name: {
        inherit name;
        value = inputs.nixago-exts.${name}.${system};
      }))
      lib.listToAttrs
    ];

    custom-exts = lib.pipe ./exts [
      self.lib.rakeLeaves
      (lib.mapAttrs (_: v: import v {inherit pkgs engines;}))
    ];

    exts = nixago-exts // custom-exts;
  in {
    devshells.default = {
      packages = [
        pkgs.lefthook
        pkgs.treefmt
        pkgs.conform
      ];

      devshell.startup.nixago.text = lib.pipe ./configs [
        self.lib.rakeLeaves
        builtins.attrValues
        (builtins.map (cfg: self.lib.importAttrOrFunction cfg {inherit self exts pkgs lib engines;}))
        nixago.makeAll
        (v: v.shellHook)
      ];
    };
  };
}
