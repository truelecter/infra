{
  klipperscreen,
  python3,
  sources,
  ...
}:
klipperscreen.overrideAttrs (_: {
  inherit (sources.klipper-screen) version src;

  pythonPath = with python3.pkgs; [
    jinja2
    netifaces
    requests
    websocket-client
    pycairo
    pygobject3
    mpv
    six
    dbus-python
  ];
})
