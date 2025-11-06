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
        # nixarr
        jellyseerr
        prowlarr
        ;
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
