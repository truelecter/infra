{
  catalog,
  publicIp,
  ...
}: {
  id = "d54af5a47c5bbe46b2dadab37391501d";
  records = {
    a_auth = {
      type = "A";
      name = catalog.domains.sso;
      content = publicIp "home";
      ttl = 1;
      proxied = true;
      id = "cf58a3eb618fee7aada9151b1fa17c45";
    };
    a_nix_cache = {
      type = "A";
      name = "nix-cache.tlctr.me";
      content = publicIp "home";
      ttl = 1;
      proxied = true;
      id = "012e42caa246b417c30ada48df249d54";
    };
    a_nix_proxy = {
      type = "A";
      name = "nix-proxy.tlctr.me";
      content = publicIp "home";
      ttl = 1;
      proxied = true;
      id = "86823b3c611c738b9e7b0c8fd30d27a1";
    };
    a_oracle_vps = {
      type = "A";
      name = "oracle.vps.tlctr.me";
      content = publicIp "oracle";
      ttl = 60;
      id = "c3a97c91372ccb60e8f4df643dfaebb9";
    };
    mx_apex_10 = {
      type = "MX";
      name = "tlctr.me";
      content = "mx.zoho.eu";
      priority = 10;
      ttl = 600;
      id = "7f1d9a3eff87aecc6585d889939bbc44";
    };
    mx_apex_20 = {
      type = "MX";
      name = "tlctr.me";
      content = "mx2.zoho.eu";
      priority = 20;
      ttl = 600;
      id = "7365fc7d1064bbc77545b144515a14df";
    };
    mx_apex_50 = {
      type = "MX";
      name = "tlctr.me";
      content = "mx3.zoho.eu";
      priority = 50;
      ttl = 600;
      id = "85703c055af73583d175b2e851bae4fb";
    };
    txt_apex_spf = {
      type = "TXT";
      name = "tlctr.me";
      content = "\"v=spf1 include:zohomail.eu ~all\"";
      ttl = 3600;
      id = "793a1251cf5826a33e1800d16dfe07cb";
    };
    txt_apex_zoho_verification = {
      type = "TXT";
      name = "tlctr.me";
      content = "\"zoho-verification=zb08923285.zmverify.zoho.eu\"";
      ttl = 600;
      id = "c96ae834bf914d29855d3d19e7a66a2f";
    };
    txt_zmail_domainkey = {
      type = "TXT";
      name = "zmail._domainkey.tlctr.me";
      content = "\"v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCjVUinYIab/RH49QcDo3ijf+sY0n0I6e8BfiwV7BbTUjm7OS3HVaYWfsFE4d6NRWDHesfRs9JDh2MpvNY9q4iCNZrL9BuWWmL/8uM+KW4r2u4BGtjKk1Vqc3b6ZUewwCkQDy/UUP3sKueiVqimz6+nN83rLec3WRBNp/KDR/lYBQIDAQAB\"";
      ttl = 600;
      id = "70e6f46989788144120707ca1b99a500";
    };
  };
}
