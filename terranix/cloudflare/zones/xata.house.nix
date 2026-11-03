{
  catalog,
  publicIp,
  ...
}: let
  domain = catalog.domains.media;
in {
  id = "4e97f21ee196c47fa6587bd6a27b694c";

  records = {
    a_apex = {
      type = "A";
      name = domain;
      content = publicIp "home";
      ttl = 1;
      proxied = true;
    };
    a_s4v = {
      type = "A";
      name = "s4v.${domain}";
      content = publicIp "s4v";
      ttl = 1;
      proxied = true;
    };
  };
}
