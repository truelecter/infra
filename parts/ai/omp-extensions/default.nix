# OMP extension packages. Each `<name>/` folder is a local extension (entry declared in its
# package.json `omp.extensions`); `gsd` wraps the gsd-omp installer output and is only built when
# `gsd-omp` is given. Every value is a directory that `programs.oh-my-pi.extensions` accepts as-is.
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

  localNames = lib.attrNames (lib.filterAttrs (_: type: type == "directory") (builtins.readDir ./.));

  # `gsd-omp install` writes extensions/gsd-omp.ts, agents/ and skills/ with the install root baked
  # into them; installing straight into $out makes that root the store path itself. OMP reads the
  # package.json manifest of a configured extension directory and picks up its agents/ and skills/.
  gsd = runCommand "omp-extension-gsd-${gsd-omp.version}" {nativeBuildInputs = [gsd-omp];} ''
    HOME="$TMPDIR" gsd-omp install --root "$out"
    cat > "$out/package.json" <<'EOF'
    {
      "name": "gsd-omp",
      "private": true,
      "version": "${gsd-omp.version}",
      "omp": { "extensions": ["./extensions/gsd-omp.ts"] }
    }
    EOF
  '';
in
  lib.genAttrs localNames mkLocalExtension // lib.optionalAttrs (gsd-omp != null) {inherit gsd;}
