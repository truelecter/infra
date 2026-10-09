{
  lib,
  pkgs,
  config,
  inputs,
  ...
}: {
  programs.zsh.enable = true;

  environment = {
    systemPackages = with pkgs; [
      m-cli
      terminal-notifier
      duti
      iproute2mac
    ];

    # darwinConfig = "${self}/lib/compat";

    shellAliases = {
      nrb = "darwin-rebuild switch --flake";

      hide-desktop-icons = "defaults write com.apple.finder CreateDesktop -bool false && killall Finder";
      show-desktop-icons = "defaults write com.apple.finder CreateDesktop -bool true && killall Finder";

      empty-trash = "sudo rm -frv /Volumes/*/.Trashes; \
        sudo rm -frv ~/.Trash; \
        sudo rm -frv /private/var/log/asl/*.asl; \
        sqlite3 ~/Library/Preferences/com.apple.LaunchServices.QuarantineEventsV* 'delete from LSQuarantineEvent'";

      clear-dns-cache = "sudo dscacheutil -flushcache; \
        sudo killall -HUP mDNSResponder";
    };

    variables = {
      LSCOLORS = "gxfxcxdxcxegedabagccbd";
    };
  };

  nix = {
    nixPath = [
      # TODO: This entry should be added automatically via FUP's
      # `nix.linkInputs` and `nix.generateNixPathFromInputs` options, but
      # currently that doesn't work because nix-darwin doesn't export packages,
      # which FUP expects.
      #
      # This entry should be removed once the upstream issues are fixed.
      #
      # https://github.com/LnL7/nix-darwin/issues/277
      # https://github.com/gytis-ivaskevicius/flake-utils-plus/issues/107
      "darwin=/etc/nix/inputs/darwin"
    ];

    settings = {
      # Administrative users on Darwin are part of this group.
      trusted-users = ["@admin"];

      sandbox = "relaxed";
      # ICU data for Bun/JSC `Intl.*`
      extra-sandbox-paths = [
        "/usr/share/icu"
      ];
    };
  };

  sops.gnupg.sshKeyPaths = lib.mkDefault [
    "/etc/ssh/ssh_host_rsa_key"
  ];

  users = {
    knownGroups = ["keys"];
    groups.keys = {
      name = "keys";
      gid = 30001;
      members = ["root"];
      description = "Required by sops-nix";
    };
  };

  # Homebrew itself comes from the nix-homebrew flake input, so its version
  # moves with flake.lock instead of going stale against the cask API.
  # Taps are pinned too: every tap in `homebrew.taps` needs a matching
  # `nix-homebrew.taps` entry, `brew tap` no longer works imperatively.
  nix-homebrew = {
    enable = true;
    user = config.system.primaryUser;
    autoMigrate = true;
    mutableTaps = false;
    taps = {
      "homebrew/homebrew-core" = inputs.homebrew-core;
      "homebrew/homebrew-cask" = inputs.homebrew-cask;
    };
  };

  homebrew = {
    enable = true;
    taps = [
      "homebrew/core"
      "homebrew/cask"
    ];
    casks = [
      "launchcontrol"
    ];
    # Anything not declared in nix gets uninstalled, app data included.
    onActivation.cleanup = "zap";
  };

  system.systemBuilderArgs = lib.mkIf (config.nix.settings.sandbox == "relaxed") {
    sandboxProfile = ''
      (allow file-read* file-write* process-exec mach-lookup (subpath "${builtins.storeDir}"))
    '';
  };
}
