# Cloudflare DNS and the Tailscale tailnet, through OpenTofu. Run from the
# repository root: `nix run .#infra.plan`, `nix run .#infra` (apply).
#
# State lives in terranix/state/terraform.tfstate, encrypted with the
# passphrase from secrets/terraform.yaml, which also holds the Tailscale API
# key and the public IPs the DNS records point at. The Cloudflare token comes
# from secrets/cloudflare.env.
{
  inputs,
  config,
  ...
}: {
  imports = [
    inputs.terranix.flakeModule
  ];

  perSystem = {pkgs, ...}: {
    terranix = {
      exportDevShells = false;

      terranixConfigurations.infra = {
        workdir = "terranix/state";

        terraformWrapper = {
          package = pkgs.opentofu.withPlugins (p: [
            p.cloudflare_cloudflare
            p.tailscale_tailscale
            p.terraform-routeros_routeros
          ]);
          extraRuntimeInputs = [pkgs.sops pkgs.jq];
          # Runs inside workdir.
          prefixText = ''
            if [ ! -f ../../.sops.yaml ]; then
              echo "run from the repository root" >&2
              exit 1
            fi
            secrets=$(sops -d --output-type json ../../secrets/terraform.yaml)
            TF_VAR_state_passphrase=$(jq -r .state_passphrase <<<"$secrets")
            TF_VAR_public_ips=$(jq -c .public_ips <<<"$secrets")
            TAILSCALE_API_KEY=$(jq -r .tailscale_key <<<"$secrets")
            CLOUDFLARE_API_TOKEN=$(jq -r .cloudflare_token <<<"$secrets")
            ROS_PASSWORD=$(jq -r .routeros_password <<<"$secrets")
            TF_VAR_wifi_passphrase=$(sops -d --extract '["wireless290Pw"]' ../../secrets/wifi.yaml)
            export TF_VAR_state_passphrase TF_VAR_public_ips TAILSCALE_API_KEY CLOUDFLARE_API_TOKEN ROS_PASSWORD TF_VAR_wifi_passphrase
          '';
        };

        extraArgs.catalog = config.flake.catalog;

        modules = [
          ./state.nix
          ./cloudflare
          ./tailscale.nix
          ./routeros
        ];
      };
    };
  };
}
