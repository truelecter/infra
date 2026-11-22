# The state is committed, so it's only ever written encrypted.
{
  variable.state_passphrase = {
    type = "string";
    sensitive = true;
    description = "Passphrase for state and plan encryption, from secrets/terraform.yaml.";
  };

  terraform.encryption = {
    key_provider.pbkdf2.main.passphrase = "\${var.state_passphrase}";
    method.aes_gcm.main.keys = "\${key_provider.pbkdf2.main}";
    # `method` takes a static reference, written without `${}` in JSON.
    state = {
      method = "method.aes_gcm.main";
      enforced = true;
    };
    plan = {
      method = "method.aes_gcm.main";
      enforced = true;
    };
  };
}
