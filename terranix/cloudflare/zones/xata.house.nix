{
  catalog,
  publicIp,
  ...
}: let
  domain = catalog.domains.media;

  # Media services on the NAS, reached through sirius' wake proxy.
  viaSirius = label: id: {
    type = "A";
    name = "${label}.${domain}";
    content = catalog.hosts.sirius.net.x290.ip;
    ttl = 1;
    inherit id;
  };
in {
  id = "4e97f21ee196c47fa6587bd6a27b694c";
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
    a_arr = viaSirius "arr" "b1d97c753a72987ebd09c5b47420a9e1";
    a_immich = viaSirius "immich" "9dcc1996bf9b4a3d490aecc05d77bb11";
    a_jellyfin = viaSirius "jellyfin" "ef941b41c4fccecfd72cfeadf7215773";
    a_prowlarr = viaSirius "prowlarr" "c84580b5799ed89dcd44b58fdad4640b";
    a_qbittorrent = viaSirius "qbittorrent" "d9c9fbfea59d617a56263ce9da62103d";
    a_radarr = viaSirius "radarr" "0ddc0320501d071fa8999b6d7fae19bb";
    a_seerr = viaSirius "seerr" "1489209af360c4178d9cb622820e23ca";
    a_sonarr = viaSirius "sonarr" "c36d772d6e6f3895e4789186415f5105";
    a_sonarr_anime = viaSirius "sonarr-anime" "3e7d5e4ca865716c33dd251bfb2ac653";
  };
}
