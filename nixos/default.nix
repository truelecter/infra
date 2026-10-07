{
  self,
  inputs,
  lib,
  ...
}: let
  inherit (self) profiles users;

  suites = self.lib.buildSuites profiles (profiles: _suites: {
    base =
      (with profiles; [
        common.core
        common.caches
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

    rpi02 = [
      profiles.nixos.hardware.sbc.rpi02
      {
        imports = [
          inputs.nixos-hardware.nixosModules.raspberry-pi-3
          self.modules.nixos.raspberry-pi-overlay
          self.modules.nixos.nixos-raspberry-pi-overlays
        ];
      }
    ];

    rpi4 = [
      profiles.nixos.hardware.sbc.rpi4
      {
        imports = [
          inputs.nixos-hardware.nixosModules.raspberry-pi-4
          self.modules.nixos.raspberry-pi-overlay
          self.modules.nixos.nixos-raspberry-pi-overlays
        ];
      }
    ];

    cm4 = [
      profiles.nixos.hardware.sbc.cm4
      {
        imports = [
          inputs.nixos-hardware.nixosModules.raspberry-pi-4
          self.modules.nixos.raspberry-pi-overlay
          self.modules.nixos.nixos-raspberry-pi-overlays
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
        common.caches
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
    inherit (inputs) catppuccin nix-topology ncro mt7927;
    system = "${arch}-linux";

    isLatest = hostname == "nas";

    nixpkgsInput =
      if isLatest
      then "latest"
      else "nixpkgs";

    nixpkgs = inputs.${nixpkgsInput};

    home =
      if isLatest
      then inputs.home-unstable
      else inputs.home;
  in {
    ${hostname} = nixpkgs.lib.nixosSystem {
      specialArgs = {
        inherit inputs profiles suites users;

        inherit (self) overlays;
      };
      modules =
        # commonNixosModules
        # ++
        [
          home.nixosModules.home-manager
          catppuccin.nixosModules.catppuccin
          nix-topology.nixosModules.default
          ncro.nixosModules.ncro
          mt7927.nixosModules.default
        ]
        ++ [
          profiles.nixos.topology-common
          (
            {lib, ...}: {
              topology.extractors = {
                services.enable = false;
                kea.enable = false;
                microvm.enable = false;
                nix-minecraft.enable = false;
                nixos-container.enable = false;
              };

              networking.hostName = lib.mkDefault hostname;

              # Locked refs keep the nixpkgs sources out of the closure, see lib/locked-ref.nix.
              nix.registry = {
                nixpkgs.to = self.lib.lockedRef nixpkgsInput;
                l.to = self.lib.lockedRef "latest";
              };

              nixpkgs = {
                hostPlatform = system;
                overlays = [
                  # inputs.nix-vscode-extensions.overlays.default
                  self.overlays.latest-packages
                  self.overlays.common-external
                  self.overlays.ai
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
  # Kernels used by two or more hosts of a system. CI builds this once before
  # the host builds, so each host substitutes the kernel instead of rebuilding it.
  perSystem = {
    pkgs,
    system,
    ...
  }: let
    hosts =
      lib.filter
      (host: host.pkgs.stdenv.hostPlatform.system == system)
      (lib.attrValues self.nixosConfigurations);

    kernelsByDrv =
      lib.groupBy
      (kernel: builtins.unsafeDiscardStringContext kernel.drvPath)
      (map (host: host.config.boot.kernelPackages.kernel) hosts);

    sharedKernels = lib.filterAttrs (_: kernels: lib.length kernels > 1) kernelsByDrv;
  in {
    ci.shared-kernels = pkgs.linkFarm "shared-kernels" (lib.mapAttrsToList (drv: kernels: {
        name = lib.removeSuffix ".drv" (baseNameOf drv);
        path = lib.head kernels;
      })
      sharedKernels);
  };

  flake.nixosConfigurations = lib.pipe ./hosts [
    self.lib.rakeLeaves
    (lib.mapAttrsToList (arch: hosts: (lib.mapAttrsToList (hostname: configuration: {inherit arch hostname configuration;}) hosts)))
    lib.flatten
    (map mkHost)
    lib.mkMerge
  ];
}
