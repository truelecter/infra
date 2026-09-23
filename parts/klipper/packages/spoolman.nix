{
  lib,
  unzip,
  callPackage,
  pyproject-nix,
  uv2nix,
  pyproject-build-systems,
  python3,
  stdenvNoCC,
  sources,
  ...
}: let
  source = stdenvNoCC.mkDerivation {
    pname = "spoolman-source";

    inherit (sources.spoolman) version src;
    sourceRoot = ".";

    nativeBuildInputs = [unzip];

    installPhase = ''
      cp -r . $out
    '';
  };

  # Versions come from the release's uv.lock. Spoolman itself is a virtual
  # project there, so the venv gets its dependencies and uvicorn imports the
  # unpacked release tree.
  workspace = uv2nix.lib.workspace.loadWorkspace {
    workspaceRoot = source;
  };

  pythonSet =
    (callPackage pyproject-nix.build.packages {
      python = python3;
    }).overrideScope
    (
      lib.composeManyExtensions [
        pyproject-build-systems.overlays.wheel
        (workspace.mkPyprojectOverlay {
          sourcePreference = "wheel";
        })
      ]
    );

  pythonEnv = pythonSet.mkVirtualEnv "spoolman-env" workspace.deps.default;
in
  stdenvNoCC.mkDerivation {
    pname = "spoolman";

    inherit (sources.spoolman) version;

    src = source;

    nativeBuildInputs = [unzip];

    installPhase = ''
      mkdir -p $out/lib
      cp -r . $out/lib/spoolman
    '';

    passthru = {
      inherit pythonEnv;
      python = pythonSet.python;
    };

    meta = with lib; {
      description = "Keep track of your inventory of 3D-printer filament spools.";
      homepage = "https://github.com/Donkie/Spoolman";
      license = licenses.mit;
    };
  }
