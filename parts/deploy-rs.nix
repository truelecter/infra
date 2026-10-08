{
  self,
  lib,
  inputs,
  ...
}: let
  deploymentOverrides = {
    depsos = {
      sshOpts = [
        "-p"
        "2265"
      ];
    };
  };

  # deploy-rs with its test suite disabled: the file-watcher tests in
  # `activate` time out inside the Darwin build sandbox.
  deployRsOverlay = lib.composeExtensions inputs.deploy-rs.overlays.default (_final: prev: {
    deploy-rs =
      prev.deploy-rs
      // {
        deploy-rs = prev.deploy-rs.deploy-rs.overrideAttrs {doCheck = false;};
      };
  });

  mkNode = name: cfg: let
    inherit (cfg.pkgs.stdenv.hostPlatform) system;
    deployLib =
      (import inputs.nixpkgs {
        inherit system;
        overlays = [deployRsOverlay];
      }).deploy-rs.lib;

    activator =
      if self.lib.isLinux system
      then "nixos"
      else "darwin";
  in
    lib.recursiveUpdate
    {
      hostname = "${name}";
      # currently only a single profile system
      profilesOrder = ["system"];
      profiles.system = {
        sshUser = "truelecter";
        user = "root";
        path = deployLib.activate.${activator} cfg;
      };
    }
    (
      deploymentOverrides."${name}" or {}
    );

  # TODO: add darwin nodes
  nodes =
    (lib.mapAttrs mkNode self.nixosConfigurations)
    // (lib.mapAttrs mkNode self.darwinConfigurations);
in {
  flake = {
    overlays.deploy-rs = deployRsOverlay;

    deploy = {
      autoRollback = true;
      magicRollback = true;

      inherit nodes;
    };
  };

  perSystem = {pkgs, ...}: {
    devshells.default = {
      commands = [
        {
          package = pkgs.deploy-rs.deploy-rs;
          name = "deploy";
          category = "deploy";
        }
      ];
    };
  };
}
