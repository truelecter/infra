{
  lib,
  stdenvNoCC,
  sources,
  python3,
  pyproject-nix,
  ...
}: let
  semverRegex = "(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(-((0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*)(\\.(0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*))*))?(\\+([0-9a-zA-Z-]+(\\.[0-9a-zA-Z-]+)*))?";
  semverValid = s: builtins.match semverRegex s != null;

  python = python3;

  source = sources.klipper-cartographer-plugin;

  inherit (source) src;

  version = lib.removePrefix "v" source.version;

  project = pyproject-nix.lib.project.loadPyproject {
    projectRoot = src;
  };

  pythonVersion =
    if semverValid version
    then version
    else "0.0.0+${version}";

  cartographerPlugin = python.pkgs.buildPythonPackage (
    (
      project.renderers.buildPythonPackage {
        inherit project python;
      }
    )
    // {
      version = pythonVersion;
      patches = [./patch_hatch_build.patch];
    }
  );
in
  stdenvNoCC.mkDerivation {
    pname = "klipper-cartographer-plugin";

    inherit version src;

    dontPatch = true;
    dontConfigure = true;
    dontBuild = true;

    installPhase = ''
      mkdir -p $out/lib/extras
      # Cartographer plugin "scaffolding"
      echo "from cartographer.extra import *" > $out/lib/extras/cartographer.py
    '';

    passthru.klipper = {
      config = false;
      extras = true;

      pythonDependencies = _: [cartographerPlugin];

      plugin = cartographerPlugin;
      project = project;
      python = python;
      src = src;
    };

    meta = with lib; {
      description = "The official Cartographer3D plugin.";
      platforms = platforms.linux;
      homepage = "https://github.com/Cartographer3D/cartographer3d-plugin";
      license = licenses.gpl3Only;
    };
  }
