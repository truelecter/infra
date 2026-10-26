# `paseo-pin-workspace <workspace-id> [--unpin]`: pins a workspace in the local Paseo daemon's
# sidebar, which Paseo's CLI and MCP tools can't. It runs on the node_modules of the plugins'
# end-to-end suite (`@getpaseo/client`, `ws`), so its internal client API moves with that pin.
{
  lib,
  stdenvNoCC,
  bun,
  nodejs,
  runCommand,
  writeShellApplication,
}: let
  nodeModules = import ../../paseo-plugins/_e2e/node-modules.nix {inherit lib stdenvNoCC bun;};

  # Node resolves ESM imports from the script's folder, so the script sits next to node_modules.
  lib' = runCommand "paseo-pin-workspace-lib" {} ''
    mkdir -p "$out"
    cp ${./paseo-pin-workspace.mjs} "$out/paseo-pin-workspace.mjs"
    ln -s ${nodeModules}/node_modules "$out/node_modules"
  '';
in
  writeShellApplication {
    name = "paseo-pin-workspace";
    text = ''
      exec ${lib.getExe nodejs} ${lib'}/paseo-pin-workspace.mjs "$@"
    '';
    meta = {
      description = "Pin or unpin a workspace in the local Paseo daemon's sidebar";
      mainProgram = "paseo-pin-workspace";
    };
  }
