{publicIp, ...}: {
  id = "16fd7f39977bed46fce0abaad7c8b3f6";
  records = {
    a_apex = {
      type = "A";
      name = "tenma.moe";
      content = publicIp "home";
      ttl = 1;
      proxied = true;
      id = "9eeda5aeb7b4914db011573c47e06b55";
    };
    a_asf = {
      type = "A";
      name = "asf.tenma.moe";
      content = publicIp "home";
      ttl = 1;
      proxied = true;
      id = "96596082504bc60577feb5e8bf160584";
    };
    a_cae = {
      type = "A";
      name = "cae.tenma.moe";
      content = publicIp "oracle";
      ttl = 1;
      id = "73250be98371ea8d0bcafb0162e89b9e";
    };
    a_e9e = {
      type = "A";
      name = "e9e.tenma.moe";
      content = publicIp "oracle";
      ttl = 1;
      id = "9950676ef552bf4506cd08bdbd7b14e8";
    };
    a_litv3 = {
      type = "A";
      name = "litv3.tenma.moe";
      content = publicIp "oracle";
      ttl = 1;
      id = "459acb9ab9a0d7250e757d178f62762d";
    };
    a_mc = {
      type = "A";
      name = "mc.tenma.moe";
      content = publicIp "oracle";
      ttl = 1;
      proxied = true;
      id = "38be435cc5a6cce1e5301250c773d6e9";
    };
    a_oracle = {
      type = "A";
      name = "oracle.tenma.moe";
      content = publicIp "oracle";
      ttl = 1;
      id = "32379939183aff51a11346800380b4f1";
    };
    a_vh3 = {
      type = "A";
      name = "vh3.tenma.moe";
      content = publicIp "oracle";
      ttl = 1;
      id = "14142d82db4ca64a733f54685ecb6a22";
    };
    a_vpn = {
      type = "A";
      name = "vpn.tenma.moe";
      content = publicIp "home";
      ttl = 1;
      id = "8e231d8df85aca4ac95219bd881cb83f";
    };
    a_vpn2 = {
      type = "A";
      name = "vpn2.tenma.moe";
      content = publicIp "vpn2";
      ttl = 1;
      id = "295f42a061832983bee8842eb12a57e7";
    };
    cname_f3af7777e86bf21ff9fe57b8370552f0_pharmacy_chat = {
      type = "CNAME";
      name = "_f3af7777e86bf21ff9fe57b8370552f0.pharmacy-chat.tenma.moe";
      content = "_18a3b5ed2c582e27874304f1f8cdf7d4.duyqrilejt.acm-validations.aws";
      ttl = 1;
      id = "2d7b61c3fb37878f0df1fdd1680cd8bc";
    };
    cname_www = {
      type = "CNAME";
      name = "www.tenma.moe";
      content = "tenma.moe";
      ttl = 1;
      proxied = true;
      id = "927908e7b9bae97074efc03aa8c5250f";
    };
    mx_apex_10 = {
      type = "MX";
      name = "tenma.moe";
      content = "mx.zoho.eu";
      priority = 10;
      ttl = 1;
      id = "d5d4841e35bad334c02c90d064cb6ce5";
    };
    mx_apex_20 = {
      type = "MX";
      name = "tenma.moe";
      content = "mx2.zoho.eu";
      priority = 20;
      ttl = 1;
      id = "fb641be028f319e7c0a23dbeacc18b62";
    };
    mx_apex_50 = {
      type = "MX";
      name = "tenma.moe";
      content = "mx3.zoho.eu";
      priority = 50;
      ttl = 1;
      id = "8bb8a17b60dd2da08d32fcdf431adc8f";
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
      id = "e3550fb143ce1e5d8d18895dd9a31b1b";
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
      id = "2c0bda9f2eeb18b22ab8cdb25306c012";
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
      id = "af9e6d80f4e0649999e8c173268c04ca";
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
      id = "138becd55affde5e32dc86e1019029b0";
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
      id = "5468db30a3da4d258956000667a9007a";
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
      id = "625cbba55c755d9cd7fffe514ba319f6";
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
      id = "4659f18b9e6c00bae627fb060790acb8";
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
      id = "371978110db821056082ca02737d09f4";
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
      id = "08a8ed994de7a4c1da7ac965696054af";
    };
    txt_apex = {
      type = "TXT";
      name = "tenma.moe";
      content = "v=spf1 include:zoho.eu ~all";
      ttl = 1;
      id = "224a112419dadf763144e6d1bd30ac6a";
    };
    txt_zoho_domainkey = {
      type = "TXT";
      name = "zoho._domainkey.tenma.moe";
      content = "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCjVTfn2lLR6388j5GDClsQMpYVLGgWuH7H/JvpjqMnNg98qezYY2xQYYDmLWaoxXo+rEyNvweEtV36LI9cL6wBFNDBA/yEpNKMIxsOF9UXzUIUryI0Ef8z3hr/9JqPLMjF89FRcFUgBMWjPKJkvWT6Rg+LxHnbgXihW5kpxjeSMwIDAQAB";
      ttl = 1;
      id = "8544b2ce09aa666a971bc4d0c65e63d9";
    };
  };
}
