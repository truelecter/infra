{
  lib,
  stdenv,
  callPackage,
  pyproject-nix,
  uv2nix,
  pyproject-build-systems,
  python3,
  libsodium,
  sources,
  ...
}: let
  inherit (sources.moonraker) src;

  # Moonraker takes its version from git tags, which the source tree lacks.
  version = "0.0.0+g${lib.substring 0 7 sources.moonraker.version}";

  # Versions come from upstream's uv.lock.
  workspace = uv2nix.lib.workspace.loadWorkspace {
    workspaceRoot = src;
  };

  soext = stdenv.hostPlatform.extensions.sharedLibrary;

  overrides = final: prev: {
    moonraker = prev.moonraker.overrideAttrs (_: {
      env.PDM_BUILD_SCM_VERSION = version;
    });

    # Only an sdist for aarch64-linux.
    streaming-form-data = prev.streaming-form-data.overrideAttrs (old: {
      nativeBuildInputs =
        old.nativeBuildInputs
        ++ final.resolveBuildSystem {setuptools = [];};
    });

    # libnacl loads libsodium through ctypes.
    libnacl = prev.libnacl.overrideAttrs (_: {
      postInstall = ''
        substituteInPlace "$out/${final.python.sitePackages}/libnacl/__init__.py" \
          --replace-fail \
            "l_path = ctypes.util.find_library('sodium')" \
            "l_path = None" \
          --replace-fail \
            "ctypes.cdll.LoadLibrary('libsodium${soext}')" \
            "ctypes.cdll.LoadLibrary('${libsodium}/lib/libsodium${soext}')"
      '';
    });
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
        overrides
      ]
    );

  venv = pythonSet.mkVirtualEnv "moonraker-${version}" workspace.deps.default;
in
  venv.overrideAttrs (old: {
    meta =
      (old.meta or {})
      // {
        description = "API web server for Klipper";
        homepage = "https://github.com/Arksine/moonraker";
        license = lib.licenses.gpl3Only;
        mainProgram = "moonraker";
      };
  })
