{
  lib,
  pkgs,
  config,
  ...
}: {
  programs = {
    tmux.shell = lib.getExe config.programs.zsh.package;

    direnv = {
      enableZshIntegration = true;
    };

    zsh = {
      enable = true;
      enableCompletion = true;

      dotDir = config.home.homeDirectory;

      history = {
        extended = true;
        ignoreDups = true;
        ignorePatterns = ["&" "[bf]g" "c" "clear" "history" "exit" "q" "pwd" "* --help" "reset"];
        ignoreSpace = true;
        share = false;
      };

      oh-my-zsh = {
        enable = true;

        plugins = [
          "git"
          "tmux"
          # "thefuck"
        ];
      };

      initContent = lib.mkMerge [
        (
          lib.mkOrder 550 ''
            export ZSH_COMPDUMP=$XDG_CACHE_HOME/oh-my-zsh/.zcompdump-$HOST

            emulate zsh -c "$(direnv hook zsh)"

            if [[ -z $CURSOR_AGENT ]]; then
              # p10k instant prompt
              P10K_INSTANT_PROMPT="''${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-''${(%):-%n}.zsh"
              [[ ! -r "$P10K_INSTANT_PROMPT" ]] || source "$P10K_INSTANT_PROMPT"
            fi

            emulate zsh -c "$(direnv hook zsh)"
          ''
        )
        (
          lib.mkOrder 1000 ''
            [[ -f "$HOME/.sh.local" ]] && source "$HOME/.sh.local"
            export GPG_TTY=$TTY


            if [[ -n $CURSOR_AGENT ]]; then
              ZSH_THEME="robbyrussell"  # Use a simpler theme in Cursor
            else
              ZSH_THEME="powerlevel10k/powerlevel10k"

              source "${pkgs.zsh-powerlevel10k}/share/zsh-powerlevel10k/powerlevel10k.zsh-theme"
              source ${./_files/p10k-config/p10k.zsh}
            fi
          ''
        )
      ];

      plugins = [
        {
          name = "fast-syntax-highlighting";
          file = "F-Sy-H.plugin.zsh";
          src = pkgs.fetchFromGitHub {
            owner = "zdharma";
            repo = "fast-syntax-highlighting";
            rev = "v1.66";
            sha256 = "sha256-uoLrXfq31GvfHO6GTrg7Hus8da2B4SCM1Frc+mRFbFc=";
          };
        }
      ];

      localVariables = {
        DISABLE_AUTO_UPDATE = "true";
        DISABLE_MAGIC_FUNCTIONS = "true";
        DISABLE_COMPFIX = "true";
        ZSH_DISABLE_COMPFIX = "true";
        COMPLETION_WAITING_DOTS = "true";
        DISABLE_UNTRACKED_FILES_DIRTY = "true";
        HIST_STAMPS = "dd.mm.yyyy";
      };
    };
  };
}
