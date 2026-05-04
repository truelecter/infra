{
  stdenvNoCC,
  sources,
  jdk17,
  unzip,
  strip-nondeterminism,
  ...
}:
stdenvNoCC.mkDerivation {
  pname = "life-in-the-village-3";

  inherit (sources.mcs-life-in-the-village-3) version src;

  nativeBuildInputs = [jdk17 unzip strip-nondeterminism];

  dontConfigure = true;
  dontBuild = true;
  dontPatch = true;

  # unpackPhase = ''
  #   mkdir -p $out
  #   unzip $src -d $out
  # '';

  installPhase = ''
    cd ..
    mv LITV* $out
    cp ${./_files/start-forge-1.18.sh} $out/start.sh
    chmod +x $out/start.sh
  '';

  meta = {
    description = "This pack is based around town-building mod - Minecolonies and it can be casual or challenging as you want it to be";
    homepage = "https://www.curseforge.com/minecraft/modpacks/life-in-the-village-3";
  };
}
