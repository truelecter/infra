{
  self,
  inputs,
  lib,
  ...
}: let
  inherit (self) profiles;

  hmSuites = self.lib.buildSuites profiles (profiles: suites: {
    base = with profiles.home; [
      core
      git.base
      ssh
      shell.direnv
      shell.zsh
      shell.tmux
      shell.nvim
    ];

    develop = with profiles.home; [
      dev.aws
      dev.k8s
      dev.terraform
      dev.nix
      dev.go
      dev.python
      dev.embedded
    ];

    git = with profiles.home; [
      git.identity
    ];

    workstation = lib.flatten (
      with profiles.home;
        [
          dev.cursor
          dev.core-extensions
          dev.android
        ]
        ++ suites.base
        ++ suites.develop
    );

    server-dev = suites.develop ++ [inputs.nixos-vscode-server.homeModules.default];
  });

  modules = self.homeModules;
  modulesImportables = lib.attrValues modules;

  mkUser = system: username: userModule: let
    home =
      if system == "darwin"
      then
        (
          if username == "root"
          then "/var/root"
          else "/Users/${username}"
        )
      else
        (
          if username == "root"
          then "/root"
          else "/home/${username}"
        );
  in {
    ${username} = {
      pkgs,
      lib,
      ...
    }: {
      imports = [
        userModule
      ];

      _module.args = {
        inherit profiles hmSuites;
      };

      home-manager = {
        # TODO: move to system config?
        sharedModules =
          modulesImportables
          ++ [
            inputs.catppuccin.homeModules.catppuccin
          ];
        useUserPackages = true;
        useGlobalPkgs = true;
        backupFileExtension = ".bak";

        extraSpecialArgs = {
          inherit profiles hmSuites;
          flake = self;
        };

        users.${username} = {
          imports = modulesImportables;

          home.stateVersion = lib.mkDefault "22.11";
        };
      };

      users.users.${username} =
        {
          home = lib.mkDefault home;

          shell = lib.mkOverride 999 pkgs.zsh;
        }
        // (
          lib.optionalAttrs (system == "nixos") {
            isNormalUser = true;
          }
        );
    };
  };

  loadUsers = system:
    lib.pipe ./users/${system} [
      self.lib.rakeLeaves
      lib.attrsToList
      (builtins.map (v: mkUser system v.name v.value))
      self.lib.merge
    ];
in {
  flake.users = {
    darwin = loadUsers "darwin";
    nixos = loadUsers "nixos";
  };

  flake.modules.homeManager = self.lib.rakeLeaves ./modules;
}
