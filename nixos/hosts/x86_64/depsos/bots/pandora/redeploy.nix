# Redeploy webhook: the cq-pandora/assets image workflow POSTs a signed request
# to https://data.fenrir.moe/_hooks/pandora-redeploy after pushing new images.
# The unprivileged webhook only writes a trigger file; a path unit picks it up and
# restarts the containers as root, which pulls the newer images (pull = "newer").
{
  pkgs,
  config,
  inputs,
  ...
}: let
  hookId = "pandora-redeploy";
  port = 9000;
  triggerDir = "/run/pandora-redeploy";

  touchTrigger = pkgs.writeShellScript "pandora-redeploy-trigger" ''
    ${pkgs.coreutils}/bin/date +%s > ${triggerDir}/trigger
    echo "Redeploy queued"
  '';
in {
  services.webhook = {
    enable = true;
    ip = "127.0.0.1";
    inherit port;
    verbose = false;

    # The template action has to stay unescaped in the file, so it is spliced in after toJSON
    hooksTemplated.${hookId} = builtins.replaceStrings ["@REDEPLOY_SECRET@"] [''{{ getenv "REDEPLOY_SECRET" | js }}''] (builtins.toJSON {
      id = hookId;
      execute-command = "${touchTrigger}";
      include-command-output-in-response = true;
      http-methods = ["POST"];
      trigger-rule-mismatch-http-response-code = 403;
      # Same signature scheme as GitHub webhooks: HMAC-SHA256 of the raw body
      trigger-rule.match = {
        type = "payload-hmac-sha256";
        secret = "@REDEPLOY_SECRET@";
        parameter = {
          source = "header";
          name = "X-Hub-Signature-256";
        };
      };
    });
  };

  systemd.services.webhook.serviceConfig.EnvironmentFile = config.sops.secrets.pandora-redeploy.path;

  sops.secrets.pandora-redeploy = {
    sopsFile = "${inputs.self}/secrets/bots/pandora-redeploy.env";
    key = "";
    format = "dotenv";
    restartUnits = ["webhook.service"];
  };

  systemd.tmpfiles.rules = [
    "d ${triggerDir} 0750 ${config.services.webhook.user} ${config.services.webhook.group} -"
  ];

  systemd.paths.pandora-redeploy = {
    wantedBy = ["multi-user.target"];
    pathConfig.PathChanged = "${triggerDir}/trigger";
  };

  systemd.services.pandora-redeploy = let
    containers = config.virtualisation.oci-containers.containers;
  in {
    description = "Restart pandora containers on the newest images";
    serviceConfig.Type = "oneshot";
    # Pull first, one image after the other (they share the assets layer), so the
    # old containers keep serving during the slow download; the restart is then quick
    script = ''
      ${config.virtualisation.podman.package}/bin/podman pull ${containers.pandora-web-resources.image}
      ${config.virtualisation.podman.package}/bin/podman pull ${containers.pandora.image}
      ${config.systemd.package}/bin/systemctl restart podman-pandora-web-resources.service podman-pandora.service
    '';
  };

  services.nginx.virtualHosts."data.fenrir.moe".locations."= /_hooks/${hookId}" = {
    proxyPass = "http://127.0.0.1:${toString port}/hooks/${hookId}";
    extraConfig = ''
      limit_except POST { deny all; }
      client_max_body_size 16k;
    '';
  };
}
