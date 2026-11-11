# Tags pets as people in Immich: YOLO crops the animals, CLIP embeddings of
# those crops are matched against reference photos picked in the web UI.
# https://github.com/tedornitier/immich-pet-tagger
{
  config,
  inputs,
  ...
}: let
  domain = "pets.xata.house";
  immichDomain = "immich.xata.house";
  stateDir = "/var/lib/immich-pet-tagger";
  port = 2287;
in {
  systemd.tmpfiles.rules = [
    "d ${stateDir} 0700 root root -"
  ];

  virtualisation.oci-containers.containers.immich-pet-tagger = {
    image = "ghcr.io/tedornitier/immich-pet-tagger:v1.8.1-cpu";

    volumes = [
      "${stateDir}:/data"
    ];

    # The UI has no authentication of its own, oauth2-proxy guards it below.
    ports = [
      "127.0.0.1:${toString port}:8000"
    ];

    environment = {
      # Immich listens on the host's loopback only, so the container goes
      # through nginx on the bridge gateway instead.
      IMMICH_URL = "https://${immichDomain}";
      IMMICH_EXTERNAL_URL = "https://${immichDomain}";
      TAG_NAME = "Pets/Review";
      POLL_INTERVAL = "3600";
      # Larger models: about 40% fewer missed tags than yolov8n + ViT-B-16 per
      # the README. Models load only for the hourly scan.
      YOLO_MODEL_NAME = "yolov8s.pt";
      CLIP_MODEL_NAME = "ViT-L-14";
      CLIP_PRETRAINED = "openai";
      GPU_WORKERS = "1";
      THRESHOLD = "0.8";
      THRESHOLD_FALLBACK = "0.85";
      YOLO_CONF = "0.2";
    };

    environmentFiles = [config.sops.templates.immich-pet-tagger-env.path];

    extraOptions = [
      "--add-host=${immichDomain}:10.88.0.1"
    ];
  };

  services.nginx.virtualHosts.${domain} = {
    forceSSL = true;
    useACMEHost = "xata.house";

    locations."/" = {
      proxyPass = "http://127.0.0.1:${toString port}";
      recommendedProxySettings = true;
      # Find references and similar searches can run for LONG_REQUEST_TIMEOUT
      # (120 s by default).
      extraConfig = ''
        proxy_read_timeout 180s;
      '';
    };
  };

  services.oauth2-proxy.nginx.virtualHosts.${domain}.allowed_groups = ["access_arr"];

  sops = {
    secrets.immich-pet-tagger-api-key = {
      key = "pet-tagger/api-key";
      sopsFile = "${inputs.self}/secrets/immich.yaml";
    };

    templates.immich-pet-tagger-env.content = ''
      IMMICH_API_KEY=${config.sops.placeholder.immich-pet-tagger-api-key}
    '';
  };
}
