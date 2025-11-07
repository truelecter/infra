{
  imports = [
    ./nixago
  ];

  perSystem = {
    config,
    pkgs,
    ...
  }: {
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
