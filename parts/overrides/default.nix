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
    pkgs,
    lib,
    ...
  }: {
    # Hide packages not supported on this platform (e.g. darwin-only orca).
    packages =
      lib.filterAttrs
      (_: lib.meta.availableOn pkgs.stdenv.hostPlatform)
      (mkPackages pkgs);
  };

  flake = {
    overlays.latest-packages = final: prev: let
      pkgs = mkPackages final;

      inherit (prev.stdenv.hostPlatform) system;

      latest = import inputs.latest {
        inherit system;
        config.allowUnfree = true;
      };
    in {
      inherit
        (pkgs)
        tfenv
        transmissionic-web
        attic-client-chunking
        attic-server-chunking
        unifi-os-server-image
        ;

      inherit
        (latest)
        k9s
        android-tools
        vscode
        alejandra
        nixd
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
        bun
        #
        code-cursor
        tailscale
        vscode-extensions
        mosquitto
        # media-server
        prowlarr
        ffmpeg_5-full
        #shell
        zsh-patina
        # ncps
        unifi
        pnpm_10
        ;

      # krunkit 1.3+ and libkrun-efi 1.19+ for profiles/home/darwin/colima.nix. Colima's own flake
      # builds on nixpkgs 25.05 (Lima 1.0, no krunkit), so patch nixpkgs' package instead.
      colima = latest.colima.overrideAttrs (old: {
        patches = (old.patches or []) ++ [./patches/colima-krunkit-virtiofs.patch];
      });
    };

    overlays.common-external = inputs.nixpkgs.lib.composeManyExtensions [
      inputs.nix4vscode.overlays.forVscode
      inputs.llm-agents.overlays.shared-nixpkgs
    ];

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
        nixpkgs.overlays = [
          self.overlays.latest-packages
        ];
      };
    };
  };
}
