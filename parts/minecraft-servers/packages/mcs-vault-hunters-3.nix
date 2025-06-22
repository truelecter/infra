{
  stdenvNoCC,
  lib,
  sources,
  jdk17,
  unzip,
  strip-nondeterminism,
  ...
}: let
  forge-installer = sources.forge-server-40-2-9.src;
in
  stdenvNoCC.mkDerivation rec {
    pname = "vault-hunters-3";

    inherit (sources.mcs-vault-hunters-3) version src;

    nativeBuildInputs = [jdk17 unzip strip-nondeterminism];

    dontConfigure = true;
    dontBuild = true;

    unpackPhase = ''
      mkdir -p $out
      unzip $src -d $out
    '';

    installPhase = ''
      cd $out

      cp ${./_files/start-forge-1.18.sh} start.sh
      chmod +x start.sh

      java -jar ${forge-installer} --installServer $out
    '';

    fixupPhase = ''
      rm *.log vh-setup.bat run.bat
      strip-nondeterminism libraries/net/minecraft/server/*/server*-srg.jar
    '';

    outputHashMode = "recursive";
    outputHashAlgo = "sha256";
    outputHash = "sha256-rd5NgWB0hwVfFAyMVqa89aP9gKYeyK7oM+mAqEw5u4U=";

    meta = with lib; {
      description = "Vault Hunters is an RPG based modpack focusing around the mysteries and dangers of a dimension called The Vault";
      homepage = "https://www.curseforge.com/minecraft/modpacks/vault-hunters-1-18-2";
    };
  }
