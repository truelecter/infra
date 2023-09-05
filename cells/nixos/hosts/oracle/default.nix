{
  inputs,
  suites,
  profiles,
  ...
}: let
  system = "aarch64-linux";
in {
  imports = [
    inputs.nixos-vscode-server.nixosModules.default
    inputs.cells.minecraft-servers.nixosModules.minecraft-servers

    suites.base
    suites.mc

    profiles.common.networking.tailscale
    profiles.remote-builds
    profiles.faster-linux

    ./_hardware-configuration.nix
    ./_minecraft-servers
    ./_vscode-server.nix
  ];

  bee.system = system;
  bee.home = inputs.home;
  bee.pkgs = import inputs.nixos {
    inherit system;
    config.allowUnfree = true;
    overlays = with inputs.cells.minecraft-servers.overlays; [
      java
      minecraft-servers
      minecraft-mods
    ];
  };

  systemd.services.NetworkManager-wait-online.enable = false;

  services.vnstat.enable = true;

  system.stateVersion = "22.11";

  # for remote builds
  # users.users.root = {
  #   openssh.authorizedKeys.keys = [
  #     (builtins.readFile ./../../../secrets/sops/ssh/root_nas.pub)
  #   ];
  # };
}
