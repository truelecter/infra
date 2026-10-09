{
  lib,
  buildNpmPackage,
  fetchFromGitHub,
  nodejs_24,
}:
buildNpmPackage (finalAttrs: {
  pname = "gsd-omp";
  version = "1.0.25";

  src = fetchFromGitHub {
    owner = "tchivs";
    repo = "gsd-omp";
    tag = "v${finalAttrs.version}";
    hash = "sha256-zj7zVV8+1MjxLYM61eD8xEhVnG4cgTokN4FgTnGeIeQ=";
  };

  # Upstream pins @opengsd/gsd-core ^1.12.0 (lock: 1.15.0). Pin 1.14.0, so OMP reads and
  # writes .planning/ the same way as other agents running GSD 1.14.0.
  patches = [./gsd-core-1.14.0.patch];

  # The extension runs GSD's hooks, graphify worker, and gsd-tools under Node. OMP is a
  # single-file Bun executable, so `process.execPath` is OMP itself; upstream looks for Node
  # on PATH and in a few fixed places and otherwise falls back to OMP, which turns every hook
  # call into a full OMP session. Put this package's Node first, after the env overrides.
  postPatch = ''
    substituteInPlace src/extension.cjs --replace-fail \
      '[process.env.GSD_NODE_BIN, process.env.OMP_NODE_BIN]' \
      '[process.env.GSD_NODE_BIN, process.env.OMP_NODE_BIN, "${lib.getExe nodejs_24}"]'
  '';

  npmDepsHash = "sha256-ITz3GU+0kTfULRjFwwBvqus0ZhpvwgFHM3QL+7apZTA=";

  # The CLI needs Node >= 24, and the extension runs its child scripts with it (postPatch).
  nodejs = nodejs_24;

  # No build step. Upstream's prepack lints and runs the tests, which need a git checkout and
  # fail in the sandbox, so skip scripts when packing.
  dontNpmBuild = true;
  npmPackFlags = ["--ignore-scripts"];

  meta = {
    description = "Oh My Pi host plugin for GSD (extension, slash commands, agents, skills)";
    homepage = "https://github.com/tchivs/gsd-omp";
    license = lib.licenses.mit;
    mainProgram = "gsd-omp";
  };
})
