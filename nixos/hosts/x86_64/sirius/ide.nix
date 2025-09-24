{
  pkgs,
  inputs,
  ...
}: {
  home-manager.users.truelecter = {
    imports = [
      inputs.nixos-vscode-server.homeModules.default
      ({hmSuites, ...}: {imports = hmSuites.develop;})
    ];
    services.vscode-server = {
      enable = true;
      installPath = ["$HOME/.vscode-server" "$HOME/.cursor-server"];
      nodejsPackage = pkgs.nodejs_22;
      # enableFHS = true;
    };
  };

  # Rust-analyzer needs more memory
  zramSwap.enable = true;
}
