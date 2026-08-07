{
  lib,
  stdenvNoCC,
  sources,
  ...
}:
stdenvNoCC.mkDerivation {
  pname = "klipper-klippain-shaketune";

  inherit (sources.klipper-klippain-shaketune) version src;

  dontPatch = true;
  dontConfigure = true;
  dontBuild = true;

  installPhase = ''
    mkdir -p $out/lib/extras

    cp -r shaketune $out/lib/extras/
  '';

  passthru.klipper = {
    config = false;
    extras = true;
    forceExtrasDir = true;
    pythonDependencies = p:
      with p; [
        matplotlib
        numpy
        scipy
        gitpython
        pywavelets
        zstandard
      ];
  };

  meta = with lib; {
    description = "Klipper streamlined input shaper workflow and calibration tools";
    platforms = platforms.linux;
    homepage = "https://github.com/Frix-x/klippain-shaketune";
    license = licenses.gpl3Only;
  };
}
