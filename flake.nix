{
  description = "Infra Mk3.0 - The Parts";

  # nixpkgs & home-manager
  inputs = {
    nixpkgs-master.url = "github:nixos/nixpkgs/master";
    latest.url = "github:nixos/nixpkgs/nixos-unstable";
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.11";
    nixos.follows = "nixpkgs";
    # nixos.follows = "latest";

    darwin = {
      url = "github:LnL7/nix-darwin/nix-darwin-25.11";
      inputs.nixpkgs.follows = "nixos";
    };

    home = {
      url = "github:nix-community/home-manager/release-25.11";
      inputs.nixpkgs.follows = "nixos";
    };

    home-unstable = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "latest";
    };
  };

  # Library
  inputs = {
    flake-parts = {
      url = "github:hercules-ci/flake-parts";
      inputs.nixpkgs-lib.follows = "nixpkgs";
    };

    flake-utils = {
      # For deduplication
      url = "github:numtide/flake-utils";
    };

    haumea = {
      url = "github:nix-community/haumea";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    devshell = {
      url = "github:numtide/devshell";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    nixago = {
      url = "github:nix-community/nixago";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.flake-utils.follows = "flake-utils";
      inputs.nixago-exts.follows = "nixago-exts";
    };

    nixago-exts = {
      url = "github:nix-community/nixago-extensions";
      inputs.flake-utils.follows = "flake-utils";
      inputs.nixago.follows = "nixago";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  # Tools
  inputs = {
    nix-topology = {
      url = "github:oddlama/nix-topology";
      inputs.nixpkgs.follows = "latest";
    };

    deploy-rs = {
      url = "github:serokell/deploy-rs";
      inputs = {
        nixpkgs.follows = "nixpkgs";
        utils.follows = "flake-utils";
      };
    };

    nixos-hardware.url = "github:nixos/nixos-hardware";

    nixos-wsl = {
      # url = "github:nix-community/NixOS-WSL/73b681db219446267eb323763319d9438f26faf7";
      url = "github:nix-community/NixOS-WSL";
      inputs = {
        nixpkgs.follows = "nixpkgs";
      };
    };

    sops-nix = {
      url = "github:Mic92/sops-nix";
      inputs = {
        nixpkgs.follows = "nixos";
      };
    };

    nixos-rockchip = {
      url = "github:nabam/nixos-rockchip";
      inputs = {
        utils.follows = "flake-utils";
        nixpkgsStable.follows = "nixos";
        nixpkgsUnstable.follows = "nixos";
      };
    };

    nixos-raspberrypi = {
      url = "github:nvmd/nixos-raspberrypi/develop";
    };

    nixarr = {
      url = "github:rasmus-kirk/nixarr";
      inputs = {
        nixpkgs.follows = "nixpkgs";
      };
    };

    nixos-vscode-server = {
      url = "github:truelecter/nixos-vscode-server";
      inputs = {
        nixpkgs.follows = "nixpkgs";
        flake-utils.follows = "flake-utils";
      };
    };

    nix-vscode-extensions = {
      url = "github:nix-community/nix-vscode-extensions";
      inputs = {
        nixpkgs.follows = "nixpkgs";
      };
    };

    nix4vscode = {
      url = "github:nix-community/nix4vscode";
      inputs = {
        nixpkgs.follows = "latest";
      };
    };

    nvfetcher = {
      url = "github:berberman/nvfetcher";
      inputs = {
        nixpkgs.follows = "nixpkgs";
        flake-utils.follows = "flake-utils";
      };
    };

    pyproject-nix = {
      url = "github:nix-community/pyproject.nix";
      inputs = {
        nixpkgs.follows = "nixpkgs";
      };
    };

    catppuccin = {
      url = "github:catppuccin/nix/release-25.11";
      inputs = {
        nixpkgs.follows = "nixpkgs";
      };
    };

    # zen-browser-flake = {
    #   url = "github:0xc000022070/zen-browser-flake";
    #   inputs = {
    #     nixpkgs.follows = "nixpkgs";
    #     home-manager.follows = "home";
    #   };
    # };
  };

  nixConfig = {
    extra-substituters = [
      "https://nixos-raspberrypi.cachix.org"
    ];
    extra-trusted-public-keys = [
      "nixos-raspberrypi.cachix.org-1:4iMO9LXa8BqhU+Rpg6LQKiGa2lsNh/j2oiYLNOQ5sPI="
    ];
  };

  outputs = inputs @ {flake-parts, ...}:
    flake-parts.lib.mkFlake {inherit inputs;} (
      {
        config,
        lib,
        self,
        ...
      }: let
        selfLib = import ./lib {inherit inputs lib;};
      in {
        debug = true;

        systems = [
          "aarch64-darwin"
          "aarch64-linux"
          "x86_64-darwin"
          "x86_64-linux"
        ];

        flake.lib =
          selfLib
          // {
            inherit (config) systems;
          };

        flake.profiles = selfLib.rakeLeaves ./profiles;

        imports = [
          inputs.flake-parts.flakeModules.modules
          inputs.devshell.flakeModule
          inputs.nix-topology.flakeModule

          ./parts/nixpkgs.nix
          ./parts/klipper
          ./parts/minecraft-servers
          ./parts/overrides
          ./parts/raspberry-pi
          ./parts/rockchip
          ./parts/deploy-rs.nix
          ./parts/wsl
          ./parts/topology

          ./shell

          ./nixos
          ./darwin
          ./home
        ];

        perSystem = {
          config,
          self',
          inputs',
          pkgs,
          system,
          ...
        }: {
          nixpkgs = {
            config = {
              allowUnfree = true;
            };
            overlays = [
              inputs.deploy-rs.overlays.default
              inputs.nvfetcher.overlays.default
              # inputs.nix4vscode.overlays.nix4vscode
              (final: prev: {
                nix4vscode = inputs.nix4vscode.packages.${prev.stdenv.hostPlatform.system}.default;
              })
              self.overlays.latest-packages
            ];
          };
        };

        flake = {
          nixosModules = self.modules.nixos;
          homeModules = self.modules.homeManager;
        };
      }
    );
}
