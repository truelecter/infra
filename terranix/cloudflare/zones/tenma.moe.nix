{publicIp, ...}: {
  id = "16fd7f39977bed46fce0abaad7c8b3f6";
  records = {
    a_apex = {
      type = "A";
      name = "tenma.moe";
      content = publicIp "home";
      ttl = 1;
      proxied = true;
    };
    a_asf = {
      type = "A";
      name = "asf.tenma.moe";
      content = publicIp "home";
      ttl = 1;
      proxied = true;
    };
    a_cae = {
      type = "A";
      name = "cae.tenma.moe";
      content = publicIp "oracle";
      ttl = 1;
    };
    a_e9e = {
      type = "A";
      name = "e9e.tenma.moe";
      content = publicIp "oracle";
      ttl = 1;
    };
    a_litv3 = {
      type = "A";
      name = "litv3.tenma.moe";
      content = publicIp "oracle";
      ttl = 1;
    };
    a_mc = {
      type = "A";
      name = "mc.tenma.moe";
      content = publicIp "oracle";
      ttl = 1;
      proxied = true;
    };
    a_oracle = {
      type = "A";
      name = "oracle.tenma.moe";
      content = publicIp "oracle";
      ttl = 1;
    };
    a_vh3 = {
      type = "A";
      name = "vh3.tenma.moe";
      content = publicIp "oracle";
      ttl = 1;
    };
    a_vpn2 = {
      type = "A";
      name = "vpn2.tenma.moe";
      content = publicIp "vpn2";
      ttl = 1;
    };
    cname_f3af7777e86bf21ff9fe57b8370552f0_pharmacy_chat = {
      type = "CNAME";
      name = "_f3af7777e86bf21ff9fe57b8370552f0.pharmacy-chat.tenma.moe";
      content = "_18a3b5ed2c582e27874304f1f8cdf7d4.duyqrilejt.acm-validations.aws";
      ttl = 1;
    };
    cname_www = {
      type = "CNAME";
      name = "www.tenma.moe";
      content = "tenma.moe";
      ttl = 1;
      proxied = true;
    };
    mx_apex_10 = {
      type = "MX";
      name = "tenma.moe";
      content = "mx.zoho.eu";
      priority = 10;
      ttl = 1;
    };
    mx_apex_20 = {
      type = "MX";
      name = "tenma.moe";
      content = "mx2.zoho.eu";
      priority = 20;
      ttl = 1;
    };
    mx_apex_50 = {
      type = "MX";
      name = "tenma.moe";
      content = "mx3.zoho.eu";
      priority = 50;
      ttl = 1;
    };
    srv_factorio_udp_space_age = {
      type = "SRV";
      name = "_factorio._udp.space-age.tenma.moe";
      data = {
        priority = 0;
        weight = 0;
        port = 34197;
        target = "oracle.tenma.moe";
      };
      priority = 0;
      ttl = 60;
    };
    srv_minecraft_tcp_1_20 = {
      type = "SRV";
      name = "_minecraft._tcp.1-20.tenma.moe";
      data = {
        priority = 0;
        weight = 0;
        port = 25580;
        target = "oracle.tenma.moe";
      };
      priority = 0;
      ttl = 1;
    };
    srv_minecraft_tcp_cae = {
      type = "SRV";
      name = "_minecraft._tcp.cae.tenma.moe";
      data = {
        priority = 0;
        weight = 0;
        port = 25570;
        target = "oracle.tenma.moe";
      };
      priority = 0;
      ttl = 1;
    };
    srv_minecraft_tcp_dawncraft = {
      type = "SRV";
      name = "_minecraft._tcp.dawncraft.tenma.moe";
      data = {
        priority = 0;
        weight = 0;
        port = 25566;
        target = "oracle.tenma.moe";
      };
      priority = 0;
      ttl = 1;
    };
    srv_minecraft_tcp_e6e = {
      type = "SRV";
      name = "_minecraft._tcp.e6e.tenma.moe";
      data = {
        priority = 0;
        weight = 0;
        port = 25567;
        target = "oracle.tenma.moe";
      };
      priority = 0;
      ttl = 1;
    };
    srv_minecraft_tcp_e9e = {
      type = "SRV";
      name = "_minecraft._tcp.e9e.tenma.moe";
      data = {
        priority = 0;
        weight = 0;
        port = 25568;
        target = "oracle.tenma.moe";
      };
      priority = 0;
      ttl = 1;
    };
    srv_minecraft_tcp_litv3 = {
      type = "SRV";
      name = "_minecraft._tcp.litv3.tenma.moe";
      data = {
        priority = 0;
        weight = 0;
        port = 25569;
        target = "oracle.tenma.moe";
      };
      priority = 0;
      ttl = 1;
    };
    srv_minecraft_tcp_sevtech = {
      type = "SRV";
      name = "_minecraft._tcp.sevtech.tenma.moe";
      data = {
        priority = 0;
        weight = 0;
        port = 25565;
        target = "oracle.tenma.moe";
      };
      priority = 0;
      ttl = 1;
    };
    srv_minecraft_tcp_vh3 = {
      type = "SRV";
      name = "_minecraft._tcp.vh3.tenma.moe";
      data = {
        priority = 0;
        weight = 0;
        port = 25571;
        target = "oracle.tenma.moe";
      };
      priority = 0;
      ttl = 1;
    };
    txt_apex = {
      type = "TXT";
      name = "tenma.moe";
      content = "v=spf1 include:zoho.eu ~all";
      ttl = 1;
    };
    txt_zoho_domainkey = {
      type = "TXT";
      name = "zoho._domainkey.tenma.moe";
      content = "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCjVTfn2lLR6388j5GDClsQMpYVLGgWuH7H/JvpjqMnNg98qezYY2xQYYDmLWaoxXo+rEyNvweEtV36LI9cL6wBFNDBA/yEpNKMIxsOF9UXzUIUryI0Ef8z3hr/9JqPLMjF89FRcFUgBMWjPKJkvWT6Rg+LxHnbgXihW5kpxjeSMwIDAQAB";
      ttl = 1;
    };
  };
}
