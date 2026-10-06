# End-to-end tests of the Paseo plugins: `nix run .#paseo-plugins-e2e [-- <playwright args>]`.
# The harness (`run.sh`) starts an isolated Paseo daemon with every plugin from its store build,
# opens the daemon's web UI in headless Chromium through Playwright, and stops the daemon on exit.
# It needs nothing outside its own processes, so it runs on Linux and macOS and in CI
# (.github/workflows/paseo-plugins-e2e.yaml). See parts/ai/AGENTS.md, "End-to-end tests".
{
  lib,
  stdenvNoCC,
  bun,
  writeShellApplication,
  writeText,
  makeFontsConf,
  dejavu_fonts,
  coreutils,
  git,
  jq,
  nodejs,
  playwright-test,
  # Paseo's server package (the daemon, its CLI, and the daemon web UI), not the desktop app.
  paseo,
  plugins,
}: let
  fetchNodeModules = import ../node-modules.nix {inherit lib stdenvNoCC bun;};

  # `@getpaseo/client` (pinned to the Paseo version) and `ws`. After changing package.json or
  # bun.lock, set the hash to `lib.fakeHash`, build, and copy the hash from the error.
  nodeModules = fetchNodeModules {
    name = "paseo-plugins-e2e";
    dir = ./.;
    hash = "sha256-z39EwToS4x84rZkpDhJLlgqhEOWrQqr3kMi/d7+0Ttc=";
  };

  suite = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [./playwright.config.ts ./support ./specs];
  };

  # Left out, so the suite needs nothing outside its own processes:
  # - todowrite2-tasks: archived OpenCode-only plugin; the mock provider can't emit `todowrite2`.
  # - vpn: reads the real Tunnelblick and OpenVPN Connect apps through osascript, and uses only
  #   plain plugin APIs (RPC, a sidebar screen) that the other specs cover.
  testedPlugins = removeAttrs plugins ["todowrite2-tasks" "vpn"];
  pluginPaths = writeText "paseo-e2e-plugins.json" (builtins.toJSON (lib.mapAttrs (_: toString) testedPlugins));
in
  writeShellApplication {
    name = "paseo-plugins-e2e";
    runtimeInputs = [coreutils git jq nodejs playwright-test];
    runtimeEnv =
      {
        PASEO_E2E_PASEO = paseo;
        # The node the package's own wrappers use.
        PASEO_E2E_DAEMON_NODE = lib.getExe paseo.nodejs;
        PASEO_E2E_DEFAULT_SUITE = suite;
        PASEO_E2E_NODE_MODULES = "${nodeModules}/node_modules";
        PASEO_E2E_PLUGIN_PATHS = pluginPaths;
      }
      # Chromium on Linux aborts (Skia: "Not implemented") without a fontconfig configuration, which a
      # build sandbox or a minimal runner lacks. A fixed font set also keeps text metrics the same
      # from machine to machine.
      // lib.optionalAttrs stdenvNoCC.hostPlatform.isLinux {
        FONTCONFIG_FILE = makeFontsConf {fontDirectories = [dejavu_fonts];};
      };
    text = builtins.readFile ./run.sh;
    meta = {
      description = "End-to-end tests of the Paseo plugins against an isolated Paseo daemon";
      inherit (paseo.meta) platforms;
    };
  }
