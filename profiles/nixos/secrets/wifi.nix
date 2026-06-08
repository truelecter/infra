{inputs, ...}: {
  users.groups.wpa_supplicant = {};

  sops.secrets = {
    xata-password-env = {
      key = "wireless290Env";
      sopsFile = "${inputs.self}/secrets/wifi.yaml";
      mode = "0440";
      group = "wpa_supplicant";
    };
    xata-password = {
      key = "wireless290Pw";
      sopsFile = "${inputs.self}/secrets/wifi.yaml";
    };
  };
}
