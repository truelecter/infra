{
  lib,
  unzip,
  pyproject-nix,
  python3,
  stdenvNoCC,
  sources,
  makeWrapper,
  # Deps
  pre-commit,
  ruff,
  ...
}: let
  source = stdenvNoCC.mkDerivation rec {
    pname = "spoolman-source";

    inherit (sources.spoolman) version src;
    sourceRoot = ".";

    nativeBuildInputs = [unzip];

    installPhase = ''
      cp -r . $out
    '';
  };

  project = pyproject-nix.lib.project.loadPyproject {
    projectRoot = source;
  };

  python = python3.override {
    packageOverrides = self: super: {
      inherit pre-commit ruff;

      psycopg2-binary = super.psycopg2;

      scheduler = super.buildPythonPackage {
        inherit (sources.python-scheduler) pname version src;

        pyproject = true;
        propagatedBuildInputs = [
          super.setuptools
          super.typeguard
        ];
      };
    };
  };

  pythonEnv = python.withPackages (
    project.renderers.withPackages {
      inherit python;
    }
  );
in
  stdenvNoCC.mkDerivation rec {
    pname = "spoolman";

    inherit (sources.spoolman) version;

    src = source;

    nativeBuildInputs = [makeWrapper unzip];

    installPhase = ''
      mkdir -p $out/lib
      cp -r . $out/lib/spoolman
    '';

    passthru = {
      inherit python pythonEnv;
    };

    meta = with lib; {
      description = "Keep track of your inventory of 3D-printer filament spools.";
      homepage = "https://github.com/Donkie/Spoolman";
      license = licenses.mit;
    };
  }
