{
  flake = {
    overlays.vscode-extensions = final: prev: {
      vscode-marketplace = (import ./nix4vscode/generated.nix) {inherit (final) pkgs lib;};
    };
  };
}
