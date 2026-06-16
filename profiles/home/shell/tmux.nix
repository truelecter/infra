{
  config,
  lib,
  pkgs,
  ...
}: let
  oh-my-tmux-conf = "oh-my-tmux.conf";
  oh-my-tmux-conf-path = "${config.xdg.configHome}/${oh-my-tmux-conf}";
  oh-tmux-conf-local = "oh-my-tmux-local.conf";
  oh-tmux-conf-local-path = "${config.xdg.configHome}/${oh-tmux-conf-local}";

  oh-my-tmux = pkgs.stdenvNoCC.mkDerivation rec {
    pname = "oh-my-tmux";

    src = pkgs.fetchFromGitHub {
      owner = "gpakosz";
      repo = ".tmux";
      rev = "5641d3b3f5f9c353c58dfcba4c265df055a05b6b";
      sha256 = "sha256-BTeej1vzyYx068AnU8MjbQKS9veS2jOS+CaJazCtP6s=";
      stripRoot = false;
    };

    version = "5641d3b3f5f9c353c58dfcba4c265df055a05b6b";

    nativeBuildInputs = [pkgs.gnused];

    dontConfigure = true;
    dontBuild = true;

    installPhase = ''
      mkdir -p $out
      sed -e 's/~\/.tmux.conf.local/${builtins.replaceStrings ["/"] ["\\/"] oh-tmux-conf-local-path}/g' -e 's/~\/.tmux.conf/${builtins.replaceStrings ["/"] ["\\/"] oh-my-tmux-conf-path}/g' .tmux-*/.tmux.conf > $out/.tmux.conf
    '';

    meta = with lib; {
      description = "Self-contained, pretty & versatile tmux configuration";
      homepage = "https://github.com/gpakosz/.tmux";
      license = licenses.gpl3Only;
    };
  };
in {
  home.shellAliases = {
    tm = "tmux new-session -A -s main";
  };

  programs.tmux = {
    enable = true;

    clock24 = true;
    keyMode = "vi";
    shortcut = "b";
    terminal = "xterm-256color";

    plugins = with pkgs; [
      # tmuxPlugins.cpu
      {
        plugin = tmuxPlugins.resurrect;
        # extraConfig = "set -g @resurrect-strategy-nvim 'session'";
      }
      {
        plugin = tmuxPlugins.continuum;
        extraConfig = ''
          set -g @continuum-restore 'on'
          set -g @continuum-save-interval '10' # minutes
        '';
      }
    ];

    extraConfig = ''
      source-file "${oh-my-tmux-conf-path}";
    '';
  };

  # xdg.configFile."tmux/tmux.conf".text = "";
  # xdg.configFile."tmux/tmux.conf".source = "${oh-my-tmux}/.tmux.conf";

  xdg.configFile = {
    "${oh-my-tmux-conf}" = {
      source = "${oh-my-tmux}/.tmux.conf";
    };
    "${oh-tmux-conf-local}" = {
      source = ./_files/tmux.conf;
    };
  };
}
