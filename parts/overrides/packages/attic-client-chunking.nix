{
  attic-client,
  sources,
  rustPlatform,
  ...
}: let
  inherit (sources.attic) src;
in
  attic-client.overrideAttrs (o: {
    inherit src;

    pname = "attic-client-chunking";

    cargoDeps = rustPlatform.fetchCargoVendor {
      inherit src;
      hash = "sha256-f6rH5cSYzQP5K657Y/al5LE07vABzkF5nHM4wqN1Fm0=";
    };
  })
