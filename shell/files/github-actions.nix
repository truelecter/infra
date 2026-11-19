# .github/actions/prepare-build-environment/action.yml: Determinate Nix with
# the hosts' caches (profiles/common/caches.nix) plus Attic for CI.
{self, ...}: {
  perSystem = {
    lib,
    pkgs,
    ...
  }: let
    inherit (self) catalog;
    caches = (import ../../profiles/common/caches.nix {inherit catalog;}).nix.settings;

    # The nix module adds cache.nixos.org on hosts; CI's Nix needs it spelled out.
    substituters = caches.substituters ++ ["https://cache.nixos.org/"];
    trustedKeys = ["cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="] ++ caches.trusted-public-keys;
  in {
    files.file.".github/actions/prepare-build-environment/action.yml".source = (pkgs.formats.yaml {}).generate "action.yml" {
      name = "Prepare build environment";
      description = "Install Determinate Nix, Attic client, and configure Attic cache for CI";

      inputs = {
        attic-push-token = {
          description = "Token for pushing to Attic (ATTIC_PUSH_TOKEN)";
          required = true;
        };
        github-token = {
          description = "GitHub token for Nix access-tokens (typically secrets.GITHUB_TOKEN)";
          required = true;
        };
      };

      runs = {
        using = "composite";
        steps = [
          # Determinate Nix, unlike upstream Nix, retries a NAR download that
          # broke mid-stream even when the server doesn't support ranged
          # requests (Attic NARs have no Content-Length or Accept-Ranges): it
          # starts over and skips the bytes it already has.
          {
            name = "Install Nix";
            uses = "DeterminateSystems/determinate-nix-action@v3";
            "with" = {
              github-token = "\${{ inputs.github-token }}";
              diagnostic-endpoint = "";
              summarize = false;
              extra-conf = lib.concatLines [
                "substituters = ${lib.concatStringsSep " " substituters}"
                "trusted-public-keys = ${lib.concatStringsSep " " trustedKeys}"
                # Random delays of up to 1s, 2s, 4s ... 60s (about 24 minutes
                # total at most) instead of 5 attempts within 1.5s: an 800 MB
                # NAR over a lossy link can need more than 10 resumes.
                "filetransfer-retry-attempts = ${toString caches.download-attempts}"
                "filetransfer-retry-delay = 1000"
                # One HTTP/1.1 connection per transfer: a dropped connection
                # restarts one download instead of every NAR multiplexed over a
                # shared HTTP/2 one.
                "http2 = false"
                # Give up on stalled transfers after 1 minute instead of 5, so
                # the retry starts sooner.
                "stalled-download-timeout = 60"
              ];
            };
          }
          {
            name = "Install Attic with chunking support";
            id = "attic";
            shell = "bash";
            run = ''
              attic_path=$(nix build --no-link --print-out-paths github:truelecter/attic/chunked-uploads-ranges#attic-client)
              nix profile install "$attic_path"
              echo "path=$attic_path" >> "$GITHUB_OUTPUT"
            '';
          }
          {
            name = "Setup Attic cache";
            uses = "ryanccn/attic-action@v0.4.1";
            "with" = {
              endpoint = "https://${catalog.services.nix-cache.fqdn}/";
              cache = "workflows";
              token = "\${{ inputs.attic-push-token }}";
              skip-use = true;
            };
          }
          # attic-action only pushes paths added after it starts, so the client
          # installed above never lands in the cache and every job rebuilds it.
          # nix-proxy serves the workflows cache, so later runs substitute it.
          {
            name = "Push Attic client to cache";
            shell = "bash";
            run = ''
              attic push workflows "''${{ steps.attic.outputs.path }}"
            '';
          }
        ];
      };
    };
  };
}
