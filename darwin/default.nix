{
  self,
  inputs,
  lib,
  ...
}: let
  inherit (self) profiles users;

  suites = self.lib.buildSuites profiles (profiles: suites: {
    base = with profiles;
      [
        common.core
        common.cachix
        common.fonts
        common.networking.tailscale

        darwin.core
        darwin.security.pam
        darwin.security.one-password
        darwin.messengers
        darwin.secrets
      ]
      ++ builtins.attrValues self.modules.darwin;

    editors = with profiles; [
      darwin.editors.sublime-text
    ];

    games = with profiles; [
      darwin.games.minecraft
    ];

    system-preferences = with profiles.darwin.system-preferences; [
      dock
      finder
      firewall
      general
      keyboard
      trackpad
      other
    ];
  });

  mkHost = {
    hostname,
    arch ? "aarch64",
    configuration,
  }: let
    inherit (inputs) nixpkgs darwin home latest;
    system = "${arch}-darwin";
  in {
    ${hostname} = darwin.lib.darwinSystem {
      specialArgs = {
        inherit inputs profiles suites users;

        inherit (self) overlays;
      };
      modules =
        [home.darwinModules.home-manager]
        ++ [
          (
            {
              lib,
              config,
              ...
            }: {
              networking.hostName = lib.mkDefault hostname;

              nix.registry.nixpkgs.flake = nixpkgs;
              nix.registry.l.flake = latest;

              nixpkgs = {
                hostPlatform = system;

                overlays = [
                  # inputs.nix-vscode-extensions.overlays.default
                  self.overlays.latest-packages

                  inputs.nix4vscode.overlays.forVscode

                  # inputs.zen-flake.overlay
                ];

                config.allowUnfree = true;
              };
            }
          )
        ]
        ++ [configuration];
    };
  };
in {
  flake.darwinConfigurations = lib.pipe ./hosts [
    self.lib.rakeLeaves
    (lib.mapAttrsToList (hostname: configuration: {inherit hostname configuration;}))
    (builtins.map mkHost)
    self.lib.merge
  ];

  flake.modules.darwin = {};
}
