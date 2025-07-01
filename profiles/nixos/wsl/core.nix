{pkgs, ...}: {
  wsl = {
    enable = true;

    startMenuLaunchers = true;
    # docker-native.enable = true;
    # docker-desktop.enable = true;
    interop.register = true;

    usbip.enable = true;
  };

  environment.systemPackages = [
    pkgs.dbus
  ];
}
