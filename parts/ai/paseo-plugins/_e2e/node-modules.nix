# The end-to-end suite's packages: `@getpaseo/client` (pinned to the Paseo version) and `ws`. Also
# the runtime of `paseo-pin-workspace` (parts/ai/packages/paseo-pin-workspace), so both move with
# one pin. After changing package.json or bun.lock, set the hash to `lib.fakeHash`, build, and copy
# the hash from the error.
{
  lib,
  stdenvNoCC,
  bun,
}:
import ../node-modules.nix {inherit lib stdenvNoCC bun;} {
  name = "paseo-plugins-e2e";
  dir = ./.;
  hash = "sha256-aF07kSRlK4N+0DvyjILdf0tMGJRxrzEsqqbiLb38zNg=";
}
