{
  imports = [
    ./nixago
  ];

  perSystem = _: {
    devshells.default = {
      name = "infra";

      imports = [
        ./secrets
        ./repo.nix
      ];
    };

    devshells.ci = {
      name = "ci";

      imports = [
        ./repo.nix
      ];
    };
  };
}
