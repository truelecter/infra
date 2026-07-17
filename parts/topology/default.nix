{inputs, ...}: {
  imports = [
    inputs.nix-topology.flakeModule
  ];

  perSystem = _: {
    topology.modules = [
      ./routers.nix
      ./internet.nix
      ./networks.nix
    ];
  };
}
