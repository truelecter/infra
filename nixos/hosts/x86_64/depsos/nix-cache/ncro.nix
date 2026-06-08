{
  config,
  inputs,
  ...
}: let
  ncroPort = "8501";
  domainName = "nix-proxy.tlctr.me";
  storagePath = "/cache/ncro";
  cacheValidityDays = "60";
  ncroUpstream = "http://${config.services.ncro.settings.server.listen}";
in {
  services = {
    nginx = {
      enable = true;

      # TODO: https://www.cloudflare.com/ips/ with
      # real_ip_header CF-Connecting-IP;
      # real_ip_recursive on;

      appendHttpConfig = ''
        proxy_cache_path ${storagePath} keys_zone=ncro-cache:100m levels=1:2 use_temp_path=off inactive=${cacheValidityDays}d max_size=250g;

        proxy_cache_key "$host$uri";
        aio threads;
        directio 16m;
        output_buffers 2 256k;
        open_file_cache          max=20000 inactive=5m;
        open_file_cache_valid    2m;
        open_file_cache_min_uses 1;
        open_file_cache_errors   on;
      '';

      virtualHosts.${domainName} = {
        forceSSL = true;
        enableACME = true;
        kTLS = true;

        locations = {
          "/" = {
            proxyPass = ncroUpstream;
          };

          # Immutable, content-addressed NARs: cache effectively forever.
          "/nar/" = {
            proxyPass = ncroUpstream;
            extraConfig = ''
              proxy_cache ncro-cache;
              proxy_cache_lock on;
              proxy_cache_lock_timeout 10s;
              proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
              proxy_cache_valid 200 206 ${cacheValidityDays}d;
              add_header Cache-Control "public, max-age=31536000, immutable" always;
              add_header X-Cache-Status $upstream_cache_status always;
            '';
          };

          # .narinfo: changes more often (re-sign, GC). Short TTL + revalidate.
          "~ \\.narinfo$" = {
            proxyPass = ncroUpstream;
            extraConfig = ''
              proxy_cache ncro-cache;
              proxy_cache_lock on;
              proxy_cache_revalidate on;
              proxy_cache_use_stale error timeout updating
                                    http_500 http_502 http_503 http_504;
              proxy_cache_background_update on;
              proxy_cache_valid 200 30m;
              proxy_cache_valid 404 1m;
              add_header Cache-Control "public, max-age=1800, must-revalidate" always;
              add_header X-Cache-Status $upstream_cache_status always;
            '';
          };
        };

        # NARs are usually precompressed (xz/zstd) — never recompress.
        extraConfig = ''
          client_max_body_size 0;
          gzip off;
          add_header X-Cache-Status $upstream_cache_status always;
        '';
      };
    };

    ncro = {
      enable = true;

      netrcFile = config.sops.templates.ncro_netrc.path;

      settings = {
        server = {
          listen = "127.0.0.1:${ncroPort}";
          cache_priority = 25;
        };

        upstreams = let
          caches = import ./external-caches.nix;
        in
          (
            map (c: {
              inherit (c) url priority;

              public_key = c.pubKey;
            })
            caches
          )
          ++ [
            {
              url = "http://${config.services.atticd.settings.listen}/workflows";
              priority = 25;
              public_key = "workflows:nGqDVYKhDZxnNXIemS1/Bq2+i1wwQ6GE/xG2OIiMNDw=";
            }
          ];

        fallback_cache = {
          enabled = true;
          public_key = "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY=";
          url = "https://cache.nixos.org";
        };
      };
    };
  };

  systemd.tmpfiles.rules = [
    "d ${storagePath} 0755 nginx nginx -"
  ];

  systemd.services.nginx = {
    after = ["cache.mount"];
    requires = ["cache.mount"];

    serviceConfig.ReadWritePaths = [storagePath];
  };

  sops = {
    secrets = {
      ncro_attic_key = {
        sopsFile = "${inputs.self}/secrets/nix-caches.yaml";
        mode = "0400";
        key = "local-attic-key";
      };
    };

    templates.ncro_netrc = {
      content = ''
        machine 127.0.0.1
        password ${config.sops.placeholder.ncro_attic_key}
      '';
    };
  };
}
