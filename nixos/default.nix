{
  self,
  inputs,
  lib,
  ...
}: let
  inherit (self) profiles users;

  suites = self.lib.buildSuites profiles (profiles: suites: {
    base =
      (with profiles; [
        common.core
        common.cachix
        common.networking.tailscale

        nixos.core
        nixos.secrets.common
      ])
      ++ (with users.nixos; [
        truelecter
      ]);

    _3d-printing = with profiles; [
      common.networking.tailscale
      nixos.faster-linux
      nixos.minimize
      nixos.secrets.wifi
      {imports = [self.modules.nixos.klipper-with-overlay];}
    ];

    rockchip = [
      {imports = [self.modules.nixos.rockchip-with-overlay];}
    ];

    raspberry = [
      {
        imports = [
          inputs.nixos-hardware.nixosModules.raspberry-pi-4
          self.modules.nixos.raspberry-pi-overlay
        ];
      }
    ];

    minecraft-server = with profiles; [
      {imports = [self.modules.nixos.minecraft-servers-with-overlay];}
      nixos.secrets.minecraft-servers
      nixos.faster-linux
    ];

    wsl = with profiles;
      [
        common.core
        common.cachix
        # common.networking.tailscale

        nixos.core

        nixos.wsl.core
        nixos.wsl.docker
        nixos.wsl.nvidia

        nixos.secrets.common

        {imports = [inputs.nixos-wsl.nixosModules.wsl];}
      ]
      ++ (with users.nixos; [
        truelecter
      ]);
  });

  mkHost = {
    hostname,
    arch,
    configuration,
  }: let
    inherit (inputs) nixpkgs home catppuccin;
    system = "${arch}-linux";
  in {
    ${hostname} = nixpkgs.lib.nixosSystem {
      specialArgs = {
        inherit inputs profiles suites;

        inherit (self) overlays;
      };
      modules =
        # commonNixosModules
        # ++
        [
          home.nixosModules.home-manager
          catppuccin.nixosModules.catppuccin
        ]
        ++ [
          (
            {
              lib,
              config,
              ...
            }: {
              networking.hostName = lib.mkDefault hostname;

              nix.registry.nixpkgs.flake = nixpkgs;
              nix.registry.l.flake = inputs.latest;

              nixpkgs = {
                hostPlatform = system;
                overlays = [
                  # inputs.nix-vscode-extensions.overlays.default
                  self.overlays.latest-packages

                  inputs.nix4vscode.overlays.forVscode
                  self.overlays.vscode-extensions
                ];
                config.allowUnfree = true;
              };

              system.stateVersion = lib.mkDefault "23.05";
            }
          )
        ]
        ++ [configuration];
    };
  };
in {
  flake.nixosConfigurations = lib.pipe ./hosts [
    self.lib.rakeLeaves
    (lib.mapAttrsToList (arch: hosts: (lib.mapAttrsToList (hostname: configuration: {inherit arch hostname configuration;}) hosts)))
    lib.flatten
    (builtins.map mkHost)
    lib.mkMerge
  ];
}
