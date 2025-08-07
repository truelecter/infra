{
  inputs,
  self,
  ...
}: let
  mkPackages = pkgs:
    self.lib.importPackages {
      nixpkgs = pkgs;
      packages = ./packages;
      sources = ./sources/generated.nix;
    };
in {
  perSystem = {
    config,
    self',
    inputs',
    pkgs,
    system,
    ...
  }: {
    packages = mkPackages pkgs;
  };

  flake = {
    overlays.latest-packages = final: prev: let
      pkgs = mkPackages final;

      latest = import inputs.latest {
        inherit (prev.stdenv.hostPlatform) system;
        config.allowUnfree = true;
      };
    in {
      inherit (pkgs) tfenv transmissionic-web;

      inherit
        (latest)
        k9s
        android-tools
        vscode
        alejandra
        nil
        terraform
        terraform-ls
        kubelogin-oidc
        minikube
        kubernetes-helm
        nixpkgs-fmt
        statix
        cachix
        nix-index
        _1password-cli
        wrapHelm
        kubectl
        kubernetes-helmPlugins
        direnv
        amazon-ecr-credential-helper
        dive
        act
        nix-diff
        csvlens
        #
        ffmpeg_5-full
        code-cursor
        tailscale
        vscode-extensions
        mosquitto
        ;

      bluez = prev.bluez.overrideAttrs (old: {
        version = "5.72";
        src = prev.fetchurl {
          url = "mirror://kernel/linux/bluetooth/bluez-5.72.tar.xz";
          hash = "sha256-SZ1/o0WplsG7ZQ9cZ0nh2SkRH6bs4L4OmGh/7mEkU24=";
        };

        preInstall = ''
          mkdir -p $out/etc/bluetooth
          touch $out/etc/bluetooth/{main,input,network}.conf
        '';
      });
    };

    overlays.lix = final: prev: {
      nixStable = prev.nix;
      inherit (prev) nixUnstable;
      nix = final.lix;

      nix-prefetch-git =
        if (prev.lib.functionArgs prev.nix-prefetch-git.override) ? "nix"
        then prev.nix-prefetch-git.override {inherit (prev) nix;}
        else prev.nix-prefetch-git;
    };

    modules.nixos = {
      overrides-overlay = {
        nixpkgs.overlays = [self.overlays.latest-packages];
      };
    };
  };
}
