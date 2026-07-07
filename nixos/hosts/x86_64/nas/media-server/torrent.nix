{
  inputs,
  config,
  ...
}: let
  secret = key: config.sops.secrets.${key}.path;
in {
  nixflix = {
    torrentClients.qbittorrent = {
      enable = true;

      password._secret = secret "qbittorrent-password";

      serverConfig = {
        LegalNotice.Accepted = true;
        BitTorrent.Session.QueueingSystemEnabled = false;
        Preferences = {
          WebUI = {
            Username = "admin";
            # Should match qbittorrent-password
            # nix run git+https://codeberg.org/feathecutie/qbittorrent_password -- -p
            Password_PBKDF2 = "@ByteArray(42ey7FRMqjD289QCmhAi1A==:xNBjbhd04vg7g5X8+/7WAwCHyN6I0nxmyQkSibFIeMDNBr9xeCdrUicNon9A38nvK0syjgSG5m7KLcq/3rEhUw==)";
          };
          General.Locale = "en";
        };
      };
    };
  };

  sops.secrets = let
    sopsFile = "${inputs.self}/secrets/arr.yaml";

    mkSecret = key: {
      inherit sopsFile key;
    };
  in {
    qbittorrent-password = mkSecret "qbittorrent/password";
  };
}
