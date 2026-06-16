{
  lib,
  pkgs,
  ...
}: {
  environment = {
    systemPackages = with pkgs; [
      coreutils
      curl
      wget
      git
      jq
      neovim
      openssh_hpn
      rsync
      file
      gnused
      findutils
    ];

    shellAliases = {
      # quick cd
      ".." = "cd ..";
      "..." = "cd ../..";
      "cd.." = "cd ..";

      # internet ip
      # TODO: explain this hard-coded IP address
      myip = "dig +short myip.opendns.com @208.67.222.222 2>&1";

      mn = ''
        manix "" | grep '^# ' | sed 's/^# \(.*\) (.*/\1/;s/ (.*//;s/^# //' | sk --preview="manix '{}'" | xargs manix
      '';
      top = "btm";

      mkdir = "mkdir -pv";
      cp = "cp -iv";
      mv = "mv -iv";

      ll = "ls -l";
      la = "ls -la";

      path = "printf \\\"%b\\\\n\\\" \\\"\\\${PATH//:/\\\\\\n}\\\"";

      issh = "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null";

      nix-cleanup = "nix-collect-garbage -d && sudo nix-collect-garbage -d";
    };

    pathsToLink = ["/share/zsh"];

    variables = {
      # vim as default editor
      EDITOR = "vim";
      VISUAL = "vim";

      # Use custom `less` colors for `man` pages.
      LESS_TERMCAP_md = "$(tput bold 2> /dev/null; tput setaf 2 2> /dev/null)";
      LESS_TERMCAP_me = "$(tput sgr0 2> /dev/null)";

      # Don't clear the screen after quitting a `man` page.
      MANPAGER = lib.mkDefault "less -X";
    };
  };

  nix = {
    settings = let
      GB = 1024 * 1024 * 1024;
    in {
      # Prevents impurities in builds
      sandbox = lib.mkDefault true;

      # Give root user and wheel group special Nix privileges.
      trusted-users = ["root"];

      keep-outputs = lib.mkDefault true;
      keep-derivations = lib.mkDefault true;
      builders-use-substitutes = true;
      experimental-features = ["flakes" "nix-command"];
      fallback = true;
      warn-dirty = false;
      require-sigs = false;

      # Some free space
      min-free = lib.mkDefault (5 * GB);
    };

    # Improve nix store disk usage
    gc = {
      automatic = true;
      options = "--delete-older-than 7d";
    };

    nixPath = [
      "nixpkgs=flake:nixpkgs"
      "home-manager=flake:home"
    ];
  };
}
