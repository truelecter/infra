{publicIp, ...}: {
  id = "95219d7aa281c32824e55d3431e0c68a";
  records = {
    a_apex = {
      type = "A";
      name = "fenrir.moe";
      content = publicIp "depsos";
      ttl = 1;
      proxied = true;
    };
    a_webhooks = {
      type = "A";
      name = "webhooks.fenrir.moe";
      content = publicIp "depsos";
      ttl = 1;
      proxied = true;
    };
    cname_www = {
      type = "CNAME";
      name = "www.fenrir.moe";
      content = "fenrir.moe";
      ttl = 1;
      proxied = true;
    };
    txt_apex = {
      type = "TXT";
      name = "fenrir.moe";
      content = "This is Crusaders Quest database :)";
      ttl = 1;
    };
  };
}
