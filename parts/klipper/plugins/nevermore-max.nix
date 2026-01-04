{
  lib,
  stdenvNoCC,
  sources,
  ...
}:
stdenvNoCC.mkDerivation {
  pname = "nevermore-max";

  inherit (sources.klipper-nevermore-max) version src;

  dontPatch = true;
  dontConfigure = true;
  dontBuild = true;

  installPhase = ''
    mkdir -p $out/lib/extras
    cp -r ./Software/Klipper/*.py $out/lib/extras/
  '';

  passthru.klipper = {
    config = false;
    extras = true;
    forceExtrasDir = true;
  };

  meta = with lib; {
    description = "Nevermore MAX filter Klipper integration for SGP40";
    platforms = platforms.linux;
    homepage = "https://github.com/nevermore3d/Nevermore_Max/tree/master/Software/Klipper";
    license = licenses.gpl3Only;
  };
}
