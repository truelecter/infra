{
  self,
  inputs,
  lib,
  ...
}: let
  inherit (self) profiles;

  sshKeys = [
    "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDYKTlyWIGFv0GlrysdzueaXSdHOYkm35OaWsshTr0dHehFZXwWKqXms2tELy9fec2W+kr1gVFuvJcSg9wZltYuHC2OGKXhl8YITYVjSQyqd6isfGdL/HTP4psrICcpBGjmxFR7pCUcjbpF02J/HS57YC1wMEruidIm7rhwHvXIIKfCTa5BYyDaY+xEmrqFyEK2EyJ9TanaYZRE34pd+UYY2A+uKmhR7DLb/o8VlCjE8yHrq2x+kpzFMamQ2Kz4OIFejBNnBsgWK5vTlRG4xpizIDJnunIvTnj2cQqcyMLEbeJ6WIO8KolG4RcMmV2iJhuFopCYrGsAfTNyn4TprHm8D1fw95UeVEF53fyRL/REyIqazPXiMPRtYV/eH2km65j3RW1T80fFo8ueFAuKJU6uTomDbbqSmU9SbBabjlZoJWqi8BMTyX5f3xreNkM6bplca/yAMNq5KMIOlSHanak0tbV+UK4TEjAcJJuqUIvWaG1JlWGaKFmXNmwnTpC8xQhE5Iv6wv07zhXyqEi9xIQLAT5pHmP0Rf/elKObOur1epTFEapUyQ6Xfx1QmrP4zBR2WhCP2WzJsM/fGsd2fk75eQQ3W6HPIe5tD4qKZeHMGD7Ar8JyqyiXFKGtaZq/pKpG8V9nlEbSznS1CuBtvWAlvx4IVBYXq6SKfO0MgM+6Dw== yubikey-alpha"
    "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDpFCUD0nWKxif4HwJDX0oNNARG14+wv7VmmTuUrBOl27n4hlEXyGkMf12TOdX+hkbLJwEbulniTnVu/fwwpAXSkgzVn0Mmjce5YxUR4zlYUUJsv4bsKHyqlJ5cUb34SUc8Q/UDN2JphCkZRrPbaPw1NARIGKbFDXn0tp1f3mbUVVJJxczyXUaspSRFIblIPflBlPuPcq1Qh3zc1+vzXKTh1McyxPoM9vcGHh3g1zQckE5T8yOVTiGfBU8DJUtyJD5rpB0AjVyl6WOgS5z1IX9bXELOneviQzk+JYIwb7ghGJRVJPC1zYaoWu9xuia+wyMUZD/oyUiN6+ggeY0wb+A4LY7cntlGbMU+cZdt7vWYdNW668BMUZLDZymAG3z19EJLhyx35VSFl0JJytMMxPN5OtQBfmk/N0pQiI37y1kbErvVG7gtNN48NTYYiTxwmZFSqNtooq70FlZQXELZU2ZTIKeQ1CT/AOLsK/cOIRrLC7nLfZSfKQjfw2tZVm1umfnfDMnzKCTiFJFIdcoYAqB87o9wcOf7neiS32TeBZJstbmGoCWxtToJD5RfNCyUrkDTLrDgsGfOaO0hf213b4jpVbgn6SzrhdmSI7DhJB7amvqTXxxWG352qQXL1QfgwdUT7R541DFaYBKT09pbbPZd04un28V5J4J5Cg0Ag3WdqQ== yubikey-beta"
  ];

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
        inherit profiles hmSuites sshKeys;
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
