{inputs, ...}: {
  flake.modules.nixos.nixflix-cleanuparr = import ./modules/cleanuparr {inherit (inputs) nixflix;};
}
