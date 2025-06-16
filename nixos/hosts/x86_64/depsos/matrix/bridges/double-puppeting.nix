{config, ...}: {
  sops.secrets.mautrix-double-puppet = {
    sopsFile = ../../../../../../secrets/matrix/double-puppet.yaml;
    key = "";
    format = "yaml";

    owner = "matrix-synapse";
    group = "matrix-synapse";
  };

  services.matrix-synapse.settings.app_service_config_files = [config.sops.secrets.mautrix-double-puppet.path];
}
