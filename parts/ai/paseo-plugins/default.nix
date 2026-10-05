# Paseo plugin packages. Each `<id>/` folder is one plugin; its name must match the `id` in its
# `paseo-plugin.json`. Every value is a directory that `programs.paseo.plugins.<id>.package` accepts.
#
# Paseo compiles a plugin itself when it loads it, with zod, react, react-native,
# @tanstack/react-query and the plugin SDK provided by the daemon, so a package is the source tree.
# Only `dependencies` from package.json are shipped, in `node_modules`, from a fixed-output
# `bun install --production` whose hash is in `nodeModulesHashes`.
{
  lib,
  stdenvNoCC,
  bun,
  curl,
  jq,
  writeShellApplication,
  paseoVersion,
}: let
  inherit (import ./semver.nix {inherit lib;}) satisfies;

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

  # Per-plugin derivation attributes. `passthru.cli` is a command that ships with the plugin;
  # programs.paseo puts it on PATH for every configured plugin that has one.
  extraAttrs = {
    # `cli/backlog` talks to the plugin's Unix socket (server/http.ts); change both together.
    backlog.passthru.cli = writeShellApplication {
      name = "backlog";
      runtimeInputs = [curl jq];
      text = builtins.readFile ./backlog/cli/backlog;
    };

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
          dontBuild = true;
          # A source copy plus tests: not worth shipping to a remote builder. On the tl-mm4 builder the
          # vpn script tests also fail (the challenge never reaches the test socket); locally they pass.
          preferLocalBuild = true;

          doCheck = true;
          nativeCheckInputs = [bun];
          # tailscale-listener's tests bind loopback ports.
          __darwinAllowLocalNetworking = true;
          checkPhase = ''
            runHook preCheck
            mkdir node_modules
            ${lib.optionalString (deps != null) ''cp -R --no-preserve=mode ${deps}/node_modules/. node_modules/''}
            cp -R --no-preserve=mode ${testDeps}/node_modules/. node_modules/
            HOME="$TMPDIR" bun test ${testArgs}
            rm -rf node_modules
            runHook postCheck
          '';

          installPhase = ''
            runHook preInstall
            mkdir -p "$out"
            cp -R . "$out/"
            rm -rf "$out/.showcase" "$out/.gitignore" "$out/bun.lock"
            find "$out" -name '*.test.ts' -delete
            ${lib.optionalString (deps != null) ''cp -R ${deps}/node_modules "$out/"''}
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
  # Plugins whose meta.platforms excludes the host (vpn: Tunnelblick and osascript are macOS-only)
  # are left out, so `pkgs.paseo-plugins.vpn` and `.#paseo-plugin-vpn` don't exist on Linux.
  lib.filterAttrs (_: lib.meta.availableOn stdenvNoCC.hostPlatform) (lib.genAttrs names mkPlugin)
