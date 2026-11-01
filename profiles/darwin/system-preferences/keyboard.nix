{
  config,
  lib,
  ...
}: let
  user = lib.escapeShellArg config.system.primaryUser;
  off = {enabled = false;};
  # Cmd+Space: ASCII space, key code 49, Command modifier.
  cmdSpace = {
    type = "standard";
    parameters = [32 49 1048576];
  };
in {
  system.defaults.NSGlobalDomain = {
    # Use F1, F2, etc. keys as standard function keys.
    "com.apple.keyboard.fnState" = true;
  };

  system.keyboard = {
    enableKeyMapping = false;
  };

  # Written as one value: shortcuts missing here fall back to macOS defaults.
  system.defaults.CustomUserPreferences."com.apple.symbolichotkeys".AppleSymbolicHotKeys =
    # Accessibility zoom and contrast.
    lib.genAttrs (map toString (lib.range 15 26)) (_: off)
    // {
      # Select previous input source.
      "60" = {
        enabled = true;
        value = cmdSpace;
      };
      # Select next source in Input menu.
      "61" = off // {value = cmdSpace;};
      # Spotlight, gives Cmd+Space to the input source switch.
      "64" = off // {value = cmdSpace;};
      # Mission Control: move between spaces.
      "79" = {enabled = true;};
      "80" = {enabled = true;};
      "81" = {enabled = true;};
      "82" = {enabled = true;};
      "164" =
        off
        // {
          value = {
            type = "standard";
            parameters = [65535 65535 0];
          };
        };
    };

  # Applies the shortcuts now instead of at the next login.
  system.activationScripts.postActivation.text = lib.mkAfter ''
    launchctl asuser "$(id -u -- ${user})" sudo --user=${user} -- \
      /System/Library/PrivateFrameworks/SystemAdministration.framework/Resources/activateSettings -u
  '';
}
