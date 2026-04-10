{
  pkgs,
  lib,
  config,
  ...
}:
lib.mkMerge [
  (
    lib.mkIf (builtins.hasAttr "catppuccin" config) {
      catppuccin.ghostty.enable = true;
    }
  )
  {
    programs.ghostty = {
      enable = true;

      settings = {
        font-family = "IosevkaTerm Nerd Font Mono";
        font-size = 16;
        auto-update = "off";

        background = "#000000";
      };
    };
  }
  (
    lib.mkIf pkgs.stdenv.isDarwin {
      programs.ghostty = {
        package = pkgs.ghostty-bin;

        settings = {
          fullscreen = true;

          keybind = "global:cmd+§=toggle_quick_terminal";

          bell-features = "no-attention,no-title";
        };
      };
    }
  )
]
