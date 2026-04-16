{
  attic-server,
  sources,
  rustPlatform,
  ...
}: let
  inherit (sources.attic) src;
in
  attic-server.overrideAttrs (o: {
    inherit src;

    pname = "attic-server-chunking";

    cargoDeps = rustPlatform.fetchCargoVendor {
      inherit src;
      # TODO: move to importCargoLock with
      hash = "sha256-f6rH5cSYzQP5K657Y/al5LE07vABzkF5nHM4wqN1Fm0=";
    };
  })
