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

  mkNode = name: cfg: let
    inherit (cfg.pkgs.stdenv.hostPlatform) system;
    deployLib = inputs.deploy-rs.lib.${system};

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
