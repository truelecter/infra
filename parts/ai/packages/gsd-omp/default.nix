{
  lib,
  buildNpmPackage,
  fetchFromGitHub,
  nodejs_24,
}:
buildNpmPackage (finalAttrs: {
  pname = "gsd-omp";
  version = "1.0.25";

  # Our fork's `local` branch: the v1.0.25 tag plus feat/execute-phase-todo,
  # fix/execute-phase-skill-dispatch, fix/skip-compact-agents, and fix/project-core-docs
  # (README.md).
  src = fetchFromGitHub {
    owner = "truelecter";
    repo = "gsd-omp";
    rev = "669028172e6f0d1fd6477d2ea8c6fc7173ce9c41";
    hash = "sha256-fjA2EUw7qHl2XbbuUq9QDSDoUcUPkdKCZOsdmn+jn7w=";
  };

  # The extension runs GSD's hooks, graphify worker, and gsd-tools under Node. OMP is a
  # single-file Bun executable, so `process.execPath` is OMP itself; upstream looks for Node
  # on PATH and in a few fixed places and otherwise falls back to OMP, which turns every hook
  # call into a full OMP session. Put this package's Node first, after the env overrides.
  postPatch = ''
    substituteInPlace src/extension.cjs --replace-fail \
      '[process.env.GSD_NODE_BIN, process.env.OMP_NODE_BIN]' \
      '[process.env.GSD_NODE_BIN, process.env.OMP_NODE_BIN, "${lib.getExe nodejs_24}"]'
  '';

  npmDepsHash = "sha256-CV5/+L7EUb3zBj+M6gmdUjHdleZnu71ZNegqk/kp87k=";

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
