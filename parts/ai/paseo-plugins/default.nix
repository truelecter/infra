# Paseo plugin packages. Each `<id>/` folder is one plugin; its name must match the `id` in its
# `paseo-plugin.json`. Every value is a directory that `programs.paseo.plugins.<id>.package` accepts.
#
# Paseo compiles a plugin itself when it loads it, with zod, react, react-native,
# @tanstack/react-query and the plugin SDK provided by the daemon. Its compiler resolves every
# import one at a time, and from /nix/store each resolve takes about 0.2 s (beautiful-chat, about
# 1,000 imports: over a minute on every daemon start). So the build bundles each entry into a
# single file with esbuild first, keeping only the daemon's modules as imports, and the package is
# the source tree with those bundles as its entries. `dependencies` from package.json are bundled
# in from a fixed-output `bun install --production` whose hash is in `nodeModulesHashes`; no
# `node_modules` ships.
{
  lib,
  stdenvNoCC,
  bun,
  curl,
  esbuild,
  fetchurl,
  jq,
  writeShellApplication,
  paseoVersion,
}: let
  inherit (import ./semver.nix {inherit lib;}) satisfies;
  inherit (stdenvNoCC.hostPlatform) system;

  fetchNodeModules = import ./node-modules.nix {inherit lib stdenvNoCC bun;};

  # Hashes of the fixed-output node_modules: `_test-deps`, and the production dependencies of each
  # plugin that has any. After changing a package.json or bun.lock, set the entry to `lib.fakeHash`,
  # build, and copy the hash from the error.
  nodeModulesHashes = {
    _test-deps = "sha256-7FL5SJXDutMw52cooUjxTRSF8p/bYmTW8C23vihSGDA=";
    beautiful-chat = "sha256-3SeL5sqPpd/aabrdeU5GjYaqDYdy7vCE2fs4ddKXci4=";
  };

  nodeModules = name: {production}:
    fetchNodeModules {
      name = "paseo-plugin-${lib.removePrefix "_" name}";
      dir = ./. + "/${name}";
      hash = nodeModulesHashes.${name};
      inherit production;
    };

  # Paseo's runtime packages that tests import (zod, react, the plugin SDK's `defineRpc`).
  testDeps = nodeModules "_test-deps" {production = false;};

  # Modules the daemon provides to plugin code (`SERVER_HOST_MODULES` and the client externals in
  # Paseo's packages/server/src/server/plugins/compiler.ts). They stay imports in the bundles, and
  # Paseo's own compile checks them.
  hostModuleFlags = lib.concatMapStringsSep " " (module: "--external:${module}") [
    "@getpaseo/plugin"
    "@getpaseo/plugin/*"
    "@tanstack/react-query"
    "react"
    "react/*"
    "react-native"
    "zod"
  ];

  # The Hermes compiler of the React Native in Paseo's mobile app (packages/app/package.json in the
  # pinned Paseo). The app runs plugin client bundles through Hermes `eval`, and Paseo doesn't
  # lower syntax Hermes can't parse (a `class`, for one), so one such line disables the whole
  # plugin on the phone. React Native ships the binary for macOS and x86_64 Linux only.
  hermesc = let
    version = "0.81.5";
    bin =
      if stdenvNoCC.hostPlatform.isDarwin
      then "osx-bin"
      else if system == "x86_64-linux"
      then "linux64-bin"
      else null;
  in
    if bin == null
    then null
    else
      stdenvNoCC.mkDerivation {
        pname = "hermesc";
        inherit version;
        src = fetchurl {
          url = "https://registry.npmjs.org/react-native/-/react-native-${version}.tgz";
          hash = "sha256-4xchZUdk0coEC93cXWNDN2zveZ9lEVCYuiUDQK9+GLI=";
        };
        sourceRoot = "package/sdks/hermesc/${bin}";
        dontConfigure = true;
        dontBuild = true;
        installPhase = ''
          install -Dm755 hermesc "$out/bin/hermesc"
        '';
        dontFixup = true;
      };

  # Per-plugin derivation attributes. `passthru.cli` is a command that ships with the plugin;
  # programs.paseo puts it on PATH for every configured plugin that has one.
  extraAttrs = {
    # `cli/backlog` talks to the plugin's Unix socket (server/http.ts); change both together.
    backlog.passthru.cli = writeShellApplication {
      name = "backlog";
      runtimeInputs = [curl jq];
      text = builtins.readFile ./backlog/cli/backlog;
    };

    # Samples macOS tools (top, vm_stat, sysctl, lsof, osascript), so it is Darwin-only like vpn.
    system-health.meta.platforms = lib.platforms.darwin;

    # Tunnelblick runs the challenge script with a fixed environment, so it calls the system curl by
    # absolute path. The sandbox has no /usr/bin/curl; the tests run a copy that uses Nix's curl,
    # and the original is put back before install.
    vpn = {
      preCheck = ''
        script=tunnelblick/challenge-response.user.sh
        cp "$script" "$TMPDIR/challenge-response.user.sh"
        substituteInPlace "$script" --replace-fail /usr/bin/curl ${lib.getExe curl}
      '';
      postCheck = ''
        cp "$TMPDIR/challenge-response.user.sh" "$script"
      '';
      meta.platforms = lib.platforms.darwin;
    };
  };

  mkPlugin = name: let
    dir = ./. + "/${name}";
    manifest = lib.importJSON (dir + "/paseo-plugin.json");
    package = lib.importJSON (dir + "/package.json");
    requirement = manifest.requirements.paseo or null;
    src = lib.cleanSourceWith {
      src = dir;
      # A dev checkout's own `bun install` output.
      filter = path: _type: baseNameOf path != "node_modules";
    };
    deps =
      if package.dependencies or {} == {}
      then null
      else if nodeModulesHashes ? ${name}
      then nodeModules name {production = true;}
      else throw "paseo plugin ${name}: has dependencies, add it to nodeModulesHashes in parts/ai/paseo-plugins/default.nix";
    # The test script is `bun test <globs>`; run the same files.
    testArgs = lib.removePrefix "bun test" (package.scripts.test or "bun test");
  in
    assert lib.assertMsg (manifest.id == name) "paseo plugin folder ${name} has id ${manifest.id} in paseo-plugin.json";
    assert lib.assertMsg (requirement == null || satisfies paseoVersion requirement)
    "paseo plugin ${name} requires paseo ${requirement}, but the pinned paseo is ${paseoVersion}. Check the plugin against that version, then widen requirements.paseo in its paseo-plugin.json.";
      stdenvNoCC.mkDerivation (lib.recursiveUpdate {
          pname = "paseo-plugin-${name}";
          inherit (package) version;
          inherit src;

          dontConfigure = true;
          # Bundles plus tests: not worth shipping to a remote builder. On the tl-mm4 builder the
          # vpn script tests also fail (the challenge never reaches the test socket); locally they pass.
          preferLocalBuild = true;

          nativeBuildInputs = [esbuild];
          # One file per entry, as Paseo would bundle it (neutral platform with `module`/`main` for
          # the client, automatic JSX), but ESM and unlowered: Paseo still compiles the result itself.
          # A missing import fails here, the way it would fail in Paseo.
          buildPhase = ''
            runHook preBuild
            ${lib.optionalString (deps != null) ''
              mkdir node_modules
              cp -R --no-preserve=mode ${deps}/node_modules/. node_modules/
            ''}
            mkdir "$TMPDIR/bundle"
            for entry in index.client.ts index.client.tsx; do
              [[ -e $entry ]] || continue
              esbuild "$entry" --bundle --format=esm --platform=neutral --main-fields=module,main \
                --jsx=automatic ${hostModuleFlags} --log-level=warning --outfile="$TMPDIR/bundle/index.client.ts"
            done
            for entry in index.server.ts index.server.tsx; do
              [[ -e $entry ]] || continue
              esbuild "$entry" --bundle --format=esm --platform=node \
                ${hostModuleFlags} --log-level=warning --outfile="$TMPDIR/bundle/index.server.ts"
            done
            rm -rf node_modules
            runHook postBuild
          '';

          doCheck = true;
          nativeCheckInputs = [bun esbuild] ++ lib.optional (hermesc != null) hermesc;
          # tailscale-listener's tests bind loopback ports.
          __darwinAllowLocalNetworking = true;
          checkPhase = ''
            runHook preCheck
            mkdir node_modules
            ${lib.optionalString (deps != null) ''cp -R --no-preserve=mode ${deps}/node_modules/. node_modules/''}
            cp -R --no-preserve=mode ${testDeps}/node_modules/. node_modules/
            HOME="$TMPDIR" bun test ${testArgs}
            rm -rf node_modules
            ${lib.optionalString (hermesc != null) ''
              # The client bundle the phone would get: Paseo's own lowering (CommonJS, ES2020, no
              # async/await), then Hermes' parser.
              if [[ -e $TMPDIR/bundle/index.client.ts ]]; then
                esbuild "$TMPDIR/bundle/index.client.ts" --bundle --format=cjs --platform=neutral \
                  --target=es2020 --supported:async-await=false ${hostModuleFlags} \
                  --log-level=warning --outfile="$TMPDIR/hermes-check.js"
                hermesc -emit-binary -out "$TMPDIR/hermes-check.hbc" "$TMPDIR/hermes-check.js"
              fi
            ''}
            runHook postCheck
          '';

          installPhase = ''
            runHook preInstall
            mkdir -p "$out"
            cp -R . "$out/"
            rm -rf "$out/.showcase" "$out/.gitignore" "$out/bun.lock"
            find "$out" -name '*.test.ts' -delete
            rm -f "$out"/index.client.ts "$out"/index.client.tsx "$out"/index.server.ts "$out"/index.server.tsx
            cp "$TMPDIR"/bundle/* "$out/"
            runHook postInstall
          '';

          passthru = {inherit manifest;};

          meta = {
            inherit (manifest) description;
            platforms = lib.platforms.all;
          };
        }
        (extraAttrs.${name} or {}));

  # `_`-prefixed folders aren't plugins (`_test-deps`).
  names = lib.attrNames (lib.filterAttrs (name: type: type == "directory" && !lib.hasPrefix "_" name) (builtins.readDir ./.));
in
  # Plugins whose meta.platforms excludes the host (vpn: Tunnelblick and osascript; system-health:
  # top, vm_stat, and lsof's macOS output) are left out, so `pkgs.paseo-plugins.vpn` and
  # `.#paseo-plugin-vpn` don't exist on Linux.
  lib.filterAttrs (_: lib.meta.availableOn stdenvNoCC.hostPlatform) (lib.genAttrs names mkPlugin)
