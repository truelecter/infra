{
  stdenvNoCC,
  lib,
  sources,
  jdk17,
  unzip,
  strip-nondeterminism,
  ...
}: let
  ss = sources.server-starter.src;
in
  stdenvNoCC.mkDerivation rec {
    pname = "enigmatica-9-expert";

    inherit (sources.mcs-enigmatica-9-expert) version src;

    nativeBuildInputs = [jdk17 unzip strip-nondeterminism];

    dontConfigure = true;
    dontBuild = true;

    unpackPhase = ''
      mkdir -p $out
      unzip -j $src -d $out
    '';

    installPhase = ''
      cd $out

      cp ${./_files/start-forge-1.18.sh} start.sh
      chmod +x start.sh

      ls -la

      java -jar ${ss} install
    '';

    fixupPhase = ''
      rm installer.jar.log modpack-download.zip
      ls libraries/net/minecraft/server/*/server*-srg.jar
      strip-nondeterminism libraries/net/minecraft/server/*/server*-srg.jar
    '';

    outputHashMode = "recursive";
    outputHashAlgo = "sha256";
    outputHash = "sha256-sjD5dNEHUNii4uyiHG17K0iMs2khYOcSd+6pcPWqhNY=";

    meta = with lib; {
      description = "Enigmatica 9 Expert is a quest-guided progression modpack for Minecraft 1.19.2";
      homepage = "https://www.curseforge.com/minecraft/modpacks/enigmatica9expert";
    };
  }
