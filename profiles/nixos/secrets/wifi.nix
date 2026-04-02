{inputs, ...}: {
  sops.secrets = {
    xata-password-env = {
      key = "wireless290Env";
      sopsFile = "${inputs.self}/secrets/wifi.yaml";
    };
    xata-password = {
      key = "wireless290Pw";
      sopsFile = "${inputs.self}/secrets/wifi.yaml";
    };
  };
}
