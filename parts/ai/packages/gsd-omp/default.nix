{
  lib,
  buildNpmPackage,
  fetchFromGitHub,
  nodejs_24,
}:
buildNpmPackage (finalAttrs: {
  pname = "gsd-omp";
  version = "1.0.24";

  src = fetchFromGitHub {
    owner = "tchivs";
    repo = "gsd-omp";
    tag = "v${finalAttrs.version}";
    hash = "sha256-anBDnmmWcY/jqEtShX85+SxAJvNCoz38JAl0EJ5Olfs=";
  };

  # Upstream pins @opengsd/gsd-core ^1.12.0 (lock: 1.12.0). Pin 1.14.0, so OMP reads and
  # writes .planning/ the same way as other agents running GSD 1.14.0.
  patches = [./gsd-core-1.14.0.patch];

  npmDepsHash = "sha256-1j5YkUXIzBMApMLhwV0Jb3wej/Ykv4f2DRsM/V+zwVc=";

  # The CLI needs Node >= 24. The installed OMP extension runs inside OMP (Bun) and spawns
  # gsd-tools with process.execPath, so Node is only used by `gsd-omp` itself.
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
