{
  lib,
  stdenvNoCC,
  sources,
  ...
}:
stdenvNoCC.mkDerivation {
  pname = "klipper-cartographer";

  inherit (sources.klipper-cartographer) version src;

  dontPatch = true;
  dontConfigure = true;
  dontBuild = true;

  installPhase = ''
    mkdir -p $out/lib/extras
    cp idm.py scanner.py $out/lib/extras
  '';

  passthru.klipper = {
    config = false;
    extras = true;
  };

  meta = with lib; {
    description = "The Cartographer Probe plugin for klipper";
    platforms = platforms.linux;
    homepage = "https://github.com/Cartographer3D/cartographer-klipper/tree/master";
    license = licenses.gpl3Only;
  };
}
