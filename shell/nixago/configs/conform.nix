{
  self,
  exts,
  lib,
  ...
}: let
  nixosConfigurationsNames = builtins.attrNames self.nixosConfigurations;
  darwinConfigurationsNames = builtins.attrNames self.darwinConfigurations;

  ignoreParts = [
    "nixpkgs"
  ];

  partNames = let
    partName = {
      name,
      value,
    }:
      if value == "directory"
      then name
      else lib.removeSuffix ".nix" name;
  in
    lib.pipe "${self}/parts" [
      builtins.readDir
      lib.attrsToList
      (map partName)
      (builtins.filter (name: builtins.elem name ignoreParts))
    ];
in
  exts.conform {
    commit = {
      header = {
        length = 89;
        imperative = true;
      };
      body.required = false;
      gpg.required = true;
      maximumOfOneCommit = false;
      conventional = {
        types = [
          "fix"
          "feat"
          "build"
          "chore"
          "ci"
          "docs"
          "style"
          "refactor"
          "test"
        ];
        scopes =
          [
            "ci"
            "flake"
            "repo"
            "nixos"
            "darwin"
            "home"
            "common"
          ]
          ++ partNames
          ++ nixosConfigurationsNames
          ++ darwinConfigurationsNames;
        descriptionLength = 72;
      };
    };
  }
