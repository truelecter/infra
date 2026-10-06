{lib, ...}: let
  lock = lib.importJSON ../flake.lock;

  # Lock node of an input path from the root node, resolving `follows`.
  nodeOf = path:
    lib.foldl' (
      node: name: let
        input = lock.nodes.${node}.inputs.${name};
      in
        if lib.isList input
        then nodeOf input
        else input
    )
    lock.root
    path;
in
  # The locked flake reference of a root input, as written in flake.lock.
  # Unlike `nix.registry.<name>.flake = input`, it holds no store path, so a
  # registry entry built from it keeps the input's source out of the system
  # closure. Nix fetches the pinned source on first use.
  name: lock.nodes.${nodeOf [name]}.locked
