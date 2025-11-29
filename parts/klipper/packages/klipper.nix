{
  stdenv,
  lib,
  python3,
  makeWrapper,
  sources,
  plugins ? [],
  pluginsInstallDir ? "extras",
  writeShellScript,
  pyproject-nix,
  isKalico ? false,
  ...
}: let
  python = python3;

  mkPythonEnv = src: let
    pluginDependencies = pythonPackages:
      lib.unique (
        (
          lib.flatten (
            builtins.map (
              plugin:
                if plugin.passthru.klipper ? pythonDependencies
                then (plugin.passthru.klipper.pythonDependencies pythonPackages)
                else []
            )
            plugins
          )
        )
        ++ (
          with pythonPackages; [numpy matplotlib]
        )
      );

    project = pyproject-nix.lib.project.loadRequirementsTxt {
      projectRoot = "${src}/klippy";
      requirements = builtins.readFile "${src}/scripts/klippy-requirements.txt";
    };

    pythonEnv = python.withPackages (
      project.renderers.withPackages {
        inherit python;

        extraPackages = pluginDependencies;
      }
    );
  in
    pythonEnv;
in
  stdenv.mkDerivation rec {
    inherit (sources.klipper) pname version src;

    pythonEnv = mkPythonEnv src;

    sourceRoot = "source/klippy";

    # NB: This is needed for the postBuild step
    nativeBuildInputs = [
      (python.withPackages (p: with p; [cffi]))
      makeWrapper
    ];

    buildInputs = [pythonEnv];

    # we need to run this to prebuild the chelper.
    postBuild = ''
      python ./chelper/__init__.py
    '';

    # Python 3 is already supported but shebangs aren't updated yet
    postPatch = ''
      for file in klippy.py console.py parsedump.py; do
        # not all distributions have console.py
        [ -f $file ] && substituteInPlace $file \
          --replace-warn '/usr/bin/env python2' '/usr/bin/env python'
      done
    '';

    pythonScriptWrapper = writeShellScript pname ''
      ${pythonEnv.interpreter} "@out@/lib/scripts/@script@" "$@"
    '';

    # NB: We don't move the main entry point into `/bin`, or even symlink it,
    # because it uses relative paths to find necessary modules. We could wrap but
    # this is used 99% of the time as a service, so it's not worth the effort.
    installPhase = let
      libDir =
        if isKalico
        then "klippy"
        else "klipper";
    in ''
      runHook preInstall
      mkdir -p $out/lib/${libDir}
      cp -r ./* $out/lib/${libDir}

      # Moonraker expects `config_examples` and `docs` to be available
      # under `klipper_path`
      cp -r $src/docs $out/lib/docs
      cp -r $src/config $out/lib/config
      cp -r $src/scripts $out/lib/scripts
      ${
        if isKalico
        then ""
        else "cp -r $src/klippy $out/lib/klippy"
      }

      # Add version information. For the normal procedure see https://www.klipper3d.org/Packaging.html#versioning
      # This is done like this because scripts/make_version.py is not available when sourceRoot is set to "${src.name}/klippy"
      echo "${version}-NixOS" > $out/lib/${libDir}/.version

      mkdir -p $out/bin
      chmod 755 $out/lib/${libDir}/klippy.py
      makeWrapper $out/lib/${libDir}/klippy.py $out/bin/klippy --chdir $out/lib/${libDir}

      # Symlink plugins
      ${
        lib.concatStringsSep "\n" (
          builtins.map
          # Filter only plugins with extras. There was a lib function for getting output in lib/attrset.nix
          (plugin: "ln -sf ${plugin}/lib/extras/* $out/lib/${libDir}/${pluginsInstallDir}/")
          (builtins.filter (p: p ? klipper && p.klipper.extras) plugins)
        )
      }

      substitute "$pythonScriptWrapper" "$out/bin/klipper-calibrate-shaper" \
        --subst-var "out" \
        --subst-var-by "script" "calibrate_shaper.py"
      chmod 755 "$out/bin/klipper-calibrate-shaper"

      runHook postInstall
    '';

    passthru.plugins = plugins;

    meta = with lib; {
      description = "The Klipper 3D printer firmware";
      homepage = "https://github.com/KevinOConnor/klipper";
      platforms = platforms.linux;
      license = licenses.gpl3Only;
    };
  }
