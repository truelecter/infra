{
  catalog,
  publicIp,
  ...
}: let
  domain = catalog.domains.media;
in {
  id = "4e97f21ee196c47fa6587bd6a27b694c";

  # Cloudflare ids of the catalog.services records, by service.
  serviceRecordIds = {
    arr = "b1d97c753a72987ebd09c5b47420a9e1";
    immich = "9dcc1996bf9b4a3d490aecc05d77bb11";
    jellyfin = "ef941b41c4fccecfd72cfeadf7215773";
    prowlarr = "c84580b5799ed89dcd44b58fdad4640b";
    qbittorrent = "d9c9fbfea59d617a56263ce9da62103d";
    radarr = "0ddc0320501d071fa8999b6d7fae19bb";
    seerr = "1489209af360c4178d9cb622820e23ca";
    sonarr = "c36d772d6e6f3895e4789186415f5105";
  };

  records = {
    a_apex = {
      type = "A";
      name = domain;
      content = publicIp "home";
      ttl = 1;
      proxied = true;
      id = "b93967becf635c6a2aeb49ca41847c85";
    };
    a_s4v = {
      type = "A";
      name = "s4v.${domain}";
      content = publicIp "s4v";
      ttl = 1;
      proxied = true;
      id = "d928539cd7bcef263cb1dede3604d071";
    };
  };
}
