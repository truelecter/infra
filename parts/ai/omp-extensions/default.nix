# OMP extension packages. Each `<name>/` folder is a local extension (entry declared in its
# package.json `omp.extensions`); `gsd` combines the gsd-omp installer output with the lazy entry
# in `gsd/` and is only built when `gsd-omp` is given. Every value is a directory that
# `programs.oh-my-pi.extensions` accepts as-is.
{
  lib,
  stdenvNoCC,
  runCommand,
  bun,
  gsd-omp ? null,
}: let
  mkLocalExtension = name: let
    src = ./. + "/${name}";
    manifest = lib.importJSON (src + "/package.json");
  in
    stdenvNoCC.mkDerivation {
      pname = "omp-extension-${name}";
      inherit (manifest) version;
      inherit src;

      dontConfigure = true;
      dontBuild = true;

      # Tests only import node:test / node:assert and the extension's own modules.
      doCheck = true;
      nativeCheckInputs = [bun];
      checkPhase = ''
        runHook preCheck
        HOME="$TMPDIR" bun test ./shared
        runHook postCheck
      '';

      installPhase = ''
        runHook preInstall
        mkdir -p "$out"
        cp -r index.ts package.json README.md shared "$out/"
        find "$out" -name '*.test.ts' -delete
        runHook postInstall
      '';

      meta = {
        inherit (manifest) description;
        homepage = "https://github.com/can1357/oh-my-pi";
        platforms = lib.platforms.all;
      };
    };

  localNames = lib.attrNames (lib.filterAttrs (name: type: type == "directory" && name != "gsd") (builtins.readDir ./.));

  # `gsd-omp install` writes extensions/gsd-omp.ts, agents/ and skills/ with the install root baked
  # into them; installing straight into $out makes that root the store path itself. OMP reads the
  # package.json manifest of a configured extension directory and picks up its agents/ and skills/.
  # The generated entry is replaced by the lazy one from `gsd/`, which loads the same extension.cjs
  # with the same runtime root, both read from gsd-runtime.json.
  gsd = let
    src = ./gsd;
    manifest = lib.importJSON (src + "/package.json");
    entry = "${gsd-omp}/lib/node_modules/gsd-omp/src/extension.cjs";
  in
    stdenvNoCC.mkDerivation {
      pname = "omp-extension-gsd";
      version = "${gsd-omp.version}-lazy-${manifest.version}";
      inherit src;
      nativeBuildInputs = [gsd-omp];

      dontConfigure = true;
      dontBuild = true;
      # GSD's skills and agents ship as installed; no shebang patching or stripping.
      dontFixup = true;

      doCheck = true;
      nativeCheckInputs = [bun];
      checkPhase = ''
        runHook preCheck
        HOME="$TMPDIR" bun test ./shared
        runHook postCheck
      '';

      installPhase = ''
        runHook preInstall
        HOME="$TMPDIR" gsd-omp install --root "$out"
        rm -r "$out/extensions"
        test -f ${entry}
        cp -r index.ts README.md shared "$out/"
        find "$out/shared" -name '*.test.ts' -delete
        cat > "$out/gsd-runtime.json" <<EOF
        { "extension": "${entry}", "runtimeRoot": "$out" }
        EOF
        cat > "$out/package.json" <<'EOF'
        {
          "name": "gsd-omp",
          "private": true,
          "version": "${gsd-omp.version}",
          "omp": { "extensions": ["./index.ts"] }
        }
        EOF
        runHook postInstall
      '';

      meta = {
        inherit (manifest) description;
        homepage = gsd-omp.meta.homepage;
        platforms = lib.platforms.all;
      };
    };
in
  lib.genAttrs localNames mkLocalExtension // lib.optionalAttrs (gsd-omp != null) {inherit gsd;}
