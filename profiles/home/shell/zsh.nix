{
  lib,
  pkgs,
  config,
  ...
}: let
  inherit (config.lib.zsh) dotDirRel;

  direnv = lib.getExe config.programs.direnv.package;

  pkill =
    if pkgs.stdenv.isDarwin
    then "/usr/bin/pkill"
    else "${pkgs.procps}/bin/pkill";
in {
  programs = {
    tmux.shell = lib.getExe config.programs.zsh.package;

    direnv = {
      enableZshIntegration = false;
      stdlib = ''
        export POWERLEVEL9K_INSTANT_PROMPT=quiet
      '';
    };

    # We will add it manually, it breaks p10k instant prompt
    ghostty.enableZshIntegration = true;

    zsh = {
      enable = true;
      enableCompletion = true;

      dotDir = "${config.xdg.configHome}/zsh";

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

      # Reload interractive shells after config change
      envExtra = ''
        TRAPUSR1() {
          if [[ -o INTERACTIVE ]]; then
            {echo; echo reload after config change } 1>&2

            # Drop the nix env guards so exec re-sources set-environment,
            # giving fresh nix vars (manual vars are left untouched).
            unset __NIX_DARWIN_SET_ENVIRONMENT_DONE __NIXOS_SET_ENVIRONMENT_DONE

            exec zsh
          fi
        }
      '';

      initContent = lib.mkMerge [
        (
          lib.mkOrder 550 ''
            export ZSH_COMPDUMP=$XDG_CACHE_HOME/oh-my-zsh/.zcompdump-$HOST

            ${lib.optionalString config.programs.direnv.enable ''
              emulate zsh -c "$(${direnv} hook zsh)"
            ''}

            if [[ -z $CURSOR_AGENT ]]; then
              # p10k instant prompt
              P10K_INSTANT_PROMPT="''${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-''${(%):-%n}.zsh"
              [[ ! -r "$P10K_INSTANT_PROMPT" ]] || source "$P10K_INSTANT_PROMPT"
            fi

            ${lib.optionalString config.programs.direnv.enable ''
              emulate zsh -c "$(${direnv} hook zsh)"
            ''}
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

              ${lib.optionalString config.programs.ghostty.enable ''
              if [[ -n $GHOSTTY_RESOURCES_DIR ]]; then
                source "$GHOSTTY_RESOURCES_DIR"/shell-integration/zsh/ghostty-integration
              fi
            ''}

              source "${pkgs.zsh-powerlevel10k}/share/zsh-powerlevel10k/powerlevel10k.zsh-theme"
              source ${./_files/p10k-config/p10k.zsh}

              eval "$(${pkgs.zsh-patina}/bin/zsh-patina activate)"
            fi

            PENIS=2
          ''
        )
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

  home.file."${dotDirRel}/.zshrc".onChange = ''
    run ${pkill} -USR1 zsh -u ${config.home.username}
  '';

  home.file."${dotDirRel}/.zshenv".onChange = ''
    run ${pkill} -USR1 zsh -u ${config.home.username}
  '';
}
