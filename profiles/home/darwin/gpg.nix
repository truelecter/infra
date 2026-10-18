{pkgs, ...}: let
  pinentry = pkgs.writeShellScript "pinentry-keychain" ''
    export PINENTRY_KEYCHAIN_FALLBACK=${pkgs.pinentry_mac}/${pkgs.pinentry_mac.binaryPath}
    exec ${./_files/pinentry-keychain.sh} "$@"
  '';
in {
  home.file = {
    ".gnupg/gpg-agent.conf".text = "pinentry-program ${pinentry}\n";
    ".gnupg/scdaemon.conf".text = "disable-ccid";
  };
}
