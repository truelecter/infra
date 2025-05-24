{
  suites,
  inputs,
  profiles,
  users,
  ...
}: {
  imports =
    suites.base
    ++ suites.editors
    ++ suites.system-preferences
    ++ suites.games
    ++ [
      profiles.darwin.security.yubikey
      profiles.darwin.three-d-print

      profiles.common.remote-builder
      profiles.common.build-machines

      users.darwin."andrii.panasiuk"

      ./aarch-builder.nix
    ];

  networking = {
    computerName = "Andrii.Panasiuk";
    knownNetworkServices = [
      "Wi-Fi"
      "Thunderbolt Bridge"
      "Office VPN"
      "Community VPN"
      "Tailscale Tunnel"
    ];
  };

  system.stateVersion = 4;

  system.primaryUser = "andrii.panasiuk";
}
