{
  inputs,
  self,
  ...
}: {
  imports = [
    inputs.nix-topology.flakeModule
  ];

  perSystem = _: {
    topology.modules = [
      {_module.args = {inherit (self) catalog;};}
      ./routers.nix
      ./internet.nix
      ./networks.nix
      ./darwin.nix
    ];
  };
}
