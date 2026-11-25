{
  lib,
  pkgs,
  ...
}: let
  pinentry = pkgs.writeShellScript "pinentry-credential-store" ''
    export CREDENTIAL_STORE_PINENTRY_FALLBACK=${pkgs.pinentry_mac}/${pkgs.pinentry_mac.binaryPath}
    exec ${lib.getExe pkgs.credential-store-pinentry} "$@"
  '';
in {
  home.file = {
    ".gnupg/gpg-agent.conf".text = "pinentry-program ${pinentry}\n";
    ".gnupg/scdaemon.conf".text = "disable-ccid";
  };
}
