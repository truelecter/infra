{publicIp, ...}: {
  id = "95219d7aa281c32824e55d3431e0c68a";
  records = {
    a_apex = {
      type = "A";
      name = "fenrir.moe";
      content = publicIp "home";
      ttl = 1;
      proxied = true;
      id = "2404d3a1b69d17308e1fb3092d47a835";
    };
    a_booblyk = {
      type = "A";
      name = "booblyk.fenrir.moe";
      content = publicIp "vpn2";
      ttl = 1;
      proxied = true;
      id = "c6f50a1ab39b87d1cc3f607a94066725";
    };
    a_data = {
      type = "A";
      name = "data.fenrir.moe";
      content = publicIp "home";
      ttl = 1;
      proxied = true;
      id = "201ca9776e668486009913ff50b7c7ad";
    };
    a_grafana = {
      type = "A";
      name = "grafana.fenrir.moe";
      content = publicIp "home";
      ttl = 1;
      proxied = true;
      id = "13022725e5bb54ae8edcff5206244725";
    };
    a_npm = {
      type = "A";
      name = "npm.fenrir.moe";
      content = publicIp "home";
      ttl = 1;
      proxied = true;
      id = "53c5b0cf27b6bc9f09ccc25ef016ef1c";
    };
    a_s = {
      type = "A";
      name = "s.fenrir.moe";
      content = publicIp "home";
      ttl = 1;
      proxied = true;
      id = "a2dc9bea09e7d4b037eab86db1f9b4ed";
    };
    a_ssh = {
      type = "A";
      name = "ssh.fenrir.moe";
      content = publicIp "home";
      ttl = 1;
      proxied = true;
      id = "49975366ac772b1b808450157a5d99c7";
    };
    a_webhooks = {
      type = "A";
      name = "webhooks.fenrir.moe";
      content = publicIp "home";
      ttl = 1;
      proxied = true;
      id = "23bab035ed1a3cc7295eb4f356c9b3e3";
    };
    cname_www = {
      type = "CNAME";
      name = "www.fenrir.moe";
      content = "fenrir.moe";
      ttl = 1;
      proxied = true;
      id = "872e4445bfc9dce653ebee81c0d16d90";
    };
    txt_apex = {
      type = "TXT";
      name = "fenrir.moe";
      content = "This is Crusaders Quest database :)";
      ttl = 1;
      id = "ac67886174f8c0d0b564f616933d9675";
    };
  };
}
