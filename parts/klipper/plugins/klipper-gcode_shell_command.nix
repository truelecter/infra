{
  lib,
  stdenvNoCC,
  sources,
  ...
}:
stdenvNoCC.mkDerivation {
  pname = "klipper-gcode_shell_command";

  inherit (sources.klipper-gcode_shell_command) version src;

  dontConfigure = true;
  dontBuild = true;

  installPhase = ''
    mkdir -p $out/lib/extras
    cp ./kiauh/extensions/gcode_shell_cmd/assets/gcode_shell_command.py $out/lib/extras
  '';

  passthru.klipper = {
    config = false;
    extras = true;
  };

  meta = with lib; {
    description = "Run a linux shell command from Klipper";
    platforms = platforms.linux;
    homepage = "https://github.com/dw-0/kiauh/tree/master";
    license = licenses.gpl3Only;
  };
}
