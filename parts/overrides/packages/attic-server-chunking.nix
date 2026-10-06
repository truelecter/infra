{
  attic-server,
  sources,
  rustPlatform,
  ...
}: let
  inherit (sources.attic) src;
in
  attic-server.overrideAttrs (_: {
    inherit src;

    pname = "attic-server-chunking";

    cargoDeps = rustPlatform.fetchCargoVendor {
      inherit src;
      # TODO: move to importCargoLock with
      hash = "sha256-hoI/TszgyLQttthVHRZkLmAPQVgLKFMDg3oKk5rEsSU=";
    };
  })
