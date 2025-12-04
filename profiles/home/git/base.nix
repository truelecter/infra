{
  programs.delta = {
    enable = true;
    enableGitIntegration = true;
  };

  programs.git = {
    enable = true;

    lfs.enable = true;

    ignores = [
      # Linux
      "*~"

      # MacOS
      "._*"
      ".AppleDouble"
      ".DS_Store"
      ".localized"
      ".LSOverride"
      ".Spotlight-V100"
      ".Trashes"

      # Windows
      "Desktop.ini"
      "ehthumbs.db"
      "Thumbs.db"

      # NodeJS
      "node_modules"
      "npm-debug.log*"
      "yarn-debug.log*"
      "yarn-error.log*"

      # vim
      "%*"
      "*.sw[a-z]"
      "*.un~"
      ".netrwhist"
      "Session.vim"
    ];

    settings = {
      alias = {
        git = "!exec git";

        # reset
        soft = "reset --soft";
        hard = "reset --hard";
        s1ft = "soft HEAD~1";
        h1rd = "hard HEAD~1";

        # logging
        lg = "log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit";
        plog = "log --graph --pretty='format:%C(red)%d%C(reset) %C(yellow)%h%C(reset) %ar %C(green)%aN%C(reset) %s'";
        tlog = "log --stat --since='1 Day Ago' --graph --pretty=oneline --abbrev-commit --date=relative";
        rank = "shortlog -sn --no-merges";

        # delete merged branches
        bdm = "!git branch --merged | grep -v '*' | xargs -n 1 git branch -d";
      };

      init.defaultBranch = "master";
      pretty.custom = "%C(magenta)%h%C(red)%d %C(yellow)%ar %C(green)%s %C(yellow)(%an)";

      pull.rebase = false;
      push.followTags = true;

      user.useConfigOnly = true;

      core = {
        abbrev = 12;
        autocrlf = "input";
        editor = "vim";
      };

      "diff \"bin\"".textconv = "hexdump --canonical --no-squeezing";

      # Autocorrent in 2 seconds
      help.autocorrect = 20;
    };

    includes = [
      {path = "~/.gitconfig.local";}
    ];
  };
}
