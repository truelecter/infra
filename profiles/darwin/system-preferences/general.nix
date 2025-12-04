{
  config,
  lib,
  ...
}: {
  system.defaults.smb = {
    NetBIOSName = config.networking.hostName;
    ServerDescription = config.networking.hostName;
  };

  system.defaults.NSGlobalDomain = {
    # Whether light/dark modes are toggled automatically.
    AppleFontSmoothing = 0;

    AppleInterfaceStyleSwitchesAutomatically = false;
    AppleInterfaceStyle = "Dark";

    AppleKeyboardUIMode = 3;

    AppleMeasurementUnits = "Centimeters";
    AppleMetricUnits = 1;

    ApplePressAndHoldEnabled = false;
    AppleShowAllExtensions = true;
    AppleShowAllFiles = true;

    AppleShowScrollBars = "Always";

    AppleTemperatureUnit = "Celsius";

    InitialKeyRepeat = 10;
    KeyRepeat = 2;

    NSAutomaticCapitalizationEnabled = false;
    NSAutomaticDashSubstitutionEnabled = false;
    NSAutomaticPeriodSubstitutionEnabled = false;
    NSAutomaticQuoteSubstitutionEnabled = false;
    NSAutomaticSpellingCorrectionEnabled = false;

    # Disable automatic termination of "inactive" apps.
    NSDisableAutomaticTermination = true;

    NSDocumentSaveNewDocumentsToCloud = false;

    NSNavPanelExpandedStateForSaveMode = true;
    NSNavPanelExpandedStateForSaveMode2 = true;

    NSScrollAnimationEnabled = true;

    NSTableViewDefaultSizeMode = 1;

    NSTextShowsControlCharacters = true;

    NSWindowResizeTime = 0.001;

    PMPrintingExpandedStateForPrint = true;
    PMPrintingExpandedStateForPrint2 = true;

    # Whether to hide the menu bar.
    _HIHideMenuBar = lib.mkDefault false;

    # Apple menu > System Preferences > Sound Make a feedback sound when
    # the system volume changed. This setting accepts the integers 0 or
    # 1. Defaults to 1.
    "com.apple.sound.beep.feedback" = 0;

    # Set the spring loading delay for directories. The default is the float `1.0`.
    "com.apple.springing.delay" = 0.1;
    # Enable spring loading (expose) for directories.
    "com.apple.springing.enabled" = true;
  };

  # Prevent incessant nagging when opening downloaded apps.
  system.defaults.LaunchServices.LSQuarantine = false;

  # Keep macOS up to date.
  system.defaults.SoftwareUpdate.AutomaticallyInstallMacOSUpdates = true;

  system.defaults.loginwindow = {
    DisableConsoleAccess = true;
    GuestEnabled = false;
    # Text to be shown on the login window. Default "\\U03bb".
    # LoginwindowText = null;
    PowerOffDisabledWhileLoggedIn = false;
    RestartDisabled = false;
    RestartDisabledWhileLoggedIn = false;
    SHOWFULLNAME = false;
    ShutDownDisabled = false;
    ShutDownDisabledWhileLoggedIn = false;
    SleepDisabled = true;
  };

  system.defaults.ActivityMonitor = {
    IconType = 5;
    ShowCategory = 101;
  };
}
