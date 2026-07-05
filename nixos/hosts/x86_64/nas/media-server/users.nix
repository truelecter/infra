{
  config,
  inputs,
  ...
}: let
  secret = key: config.sops.secrets.${key}.path;
in {
  nixflix.jellyfin.users = {
    admin = {
      mutable = false;
      policy.isAdministrator = true;
      password._secret = secret "jellyfin-admin-password";
    };

    mariia = {
      password._secret = secret "jellyfin-mariia-password";
      policy.isAdministrator = false;
    };

    truelecter = {
      password._secret = secret "jellyfin-truelecter-password";
      policy.isAdministrator = true;
    };
  };

  sops.secrets = let
    sopsFile = "${inputs.self}/secrets/arr.yaml";

    secret = key: {
      inherit sopsFile key;
    };
  in {
    jellyfin-admin-password = secret "jellyfin/password/admin";
    jellyfin-mariia-password = secret "jellyfin/password/mariia";
    jellyfin-truelecter-password = secret "jellyfin/password/truelecter";
  };
}
