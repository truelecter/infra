{
  attic-client,
  sources,
  rustPlatform,
  ...
}: let
  inherit (sources.attic) src;
in
  attic-client.overrideAttrs (_: {
    inherit src;

    pname = "attic-client-chunking";

    cargoDeps = rustPlatform.fetchCargoVendor {
      inherit src;
      hash = "sha256-hoI/TszgyLQttthVHRZkLmAPQVgLKFMDg3oKk5rEsSU=";
    };
  })
