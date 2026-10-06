{
  self,
  inputs,
  lib,
  ...
}: let
  inherit (self) profiles users;

  suites = self.lib.buildSuites profiles (profiles: _suites: {
    base = with profiles;
      [
        common.core
        common.caches
        common.fonts
        common.networking.tailscale

        darwin.core
        darwin.apps.alt-tab
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
    inherit (inputs) darwin home;
    system = "${arch}-darwin";
  in {
    ${hostname} = darwin.lib.darwinSystem {
      specialArgs = {
        inherit inputs profiles suites users;

        inherit (self) overlays;
      };
      modules =
        [
          home.darwinModules.home-manager
        ]
        ++ [
          (
            {lib, ...}: {
              networking.hostName = lib.mkDefault hostname;

              # Locked refs keep the nixpkgs sources out of the closure, see lib/locked-ref.nix.
              nix.registry.nixpkgs.to = self.lib.lockedRef "nixpkgs";
              nix.registry.l.to = self.lib.lockedRef "latest";

              nixpkgs = {
                hostPlatform = system;

                overlays = [
                  self.overlays.latest-packages
                  self.overlays.common-external
                  self.overlays.ai
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
    (map mkHost)
    self.lib.merge
  ];

  flake.modules.darwin = {};
}
