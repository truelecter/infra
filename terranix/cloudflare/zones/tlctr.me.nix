{...}: {
  id = "d54af5a47c5bbe46b2dadab37391501d";
  records = {
    mx_apex_10 = {
      type = "MX";
      name = "tlctr.me";
      content = "mx.zoho.eu";
      priority = 10;
      ttl = 600;
    };
    mx_apex_20 = {
      type = "MX";
      name = "tlctr.me";
      content = "mx2.zoho.eu";
      priority = 20;
      ttl = 600;
    };
    mx_apex_50 = {
      type = "MX";
      name = "tlctr.me";
      content = "mx3.zoho.eu";
      priority = 50;
      ttl = 600;
    };
    txt_apex_spf = {
      type = "TXT";
      name = "tlctr.me";
      content = "\"v=spf1 include:zohomail.eu ~all\"";
      ttl = 3600;
    };
    txt_apex_zoho_verification = {
      type = "TXT";
      name = "tlctr.me";
      content = "\"zoho-verification=zb08923285.zmverify.zoho.eu\"";
      ttl = 600;
    };
    txt_zmail_domainkey = {
      type = "TXT";
      name = "zmail._domainkey.tlctr.me";
      content = "\"v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCjVUinYIab/RH49QcDo3ijf+sY0n0I6e8BfiwV7BbTUjm7OS3HVaYWfsFE4d6NRWDHesfRs9JDh2MpvNY9q4iCNZrL9BuWWmL/8uM+KW4r2u4BGtjKk1Vqc3b6ZUewwCkQDy/UUP3sKueiVqimz6+nN83rLec3WRBNp/KDR/lYBQIDAQAB\"";
      ttl = 600;
    };
  };
}
