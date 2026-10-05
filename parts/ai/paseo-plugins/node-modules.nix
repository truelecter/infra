# A fixed-output `node_modules` from a folder's package.json and bun.lock (`bun install
# --frozen-lockfile`). Used for plugin runtime dependencies, the plugins' test dependencies, and the
# end-to-end suite. After changing the lock, set the hash to `lib.fakeHash`, build, and copy the hash
# from the error.
{
  lib,
  stdenvNoCC,
  bun,
}: {
  name,
  dir,
  hash,
  production ? false,
}:
stdenvNoCC.mkDerivation {
  name = "${name}-node-modules";
  src = lib.fileset.toSource {
    root = dir;
    fileset = lib.fileset.unions [(dir + "/package.json") (dir + "/bun.lock")];
  };
  nativeBuildInputs = [bun];
  dontConfigure = true;
  buildPhase = ''
    runHook preBuild
    export HOME="$TMPDIR" BUN_INSTALL_CACHE_DIR="$TMPDIR/bun-cache"
    bun install ${lib.optionalString production "--production"} --frozen-lockfile --ignore-scripts --no-progress
    runHook postBuild
  '';
  installPhase = ''
    runHook preInstall
    mkdir -p "$out"
    cp -R node_modules "$out/"
    rm -rf "$out/node_modules/.bin" "$out/node_modules/.cache"
    runHook postInstall
  '';
  dontFixup = true;
  outputHashMode = "recursive";
  outputHashAlgo = "sha256";
  outputHash = hash;
}
