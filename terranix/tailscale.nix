# Tailscale policy file, MagicDNS and device tags. tailscale_acl replaces the
# whole policy file, rendered to JSON, so comments live here. Tailscale IPs
# aren't committed: they come from the tailscale_device data source.
{
  lib,
  catalog,
  ...
}: let
  inherit (catalog.networks.tailscale) domain;

  tagged = lib.filterAttrs (_: h: h.tailscale.tags != []) catalog.hosts;

  # The node ID, also the import ID of tailscale_device_tags.
  nodeId = name: "\${data.tailscale_device.${name}.node_id}";

  policy = {
    tagOwners =
      lib.genAttrs
      (lib.unique (["tag:ci"] ++ lib.concatMap (h: h.tailscale.tags) (lib.attrValues catalog.hosts)))
      (_: []);

    hosts.squadbook = "\${data.tailscale_device.squadbook.addresses[0]}";

    grants = [
      # Members: full access, MagicDNS host names work.
      {
        src = ["autogroup:member"];
        dst = ["*"];
        ip = ["*"];
      }
      # Tagged builders keep normal tailnet access.
      {
        src = ["tag:gha-target"];
        dst = ["*"];
        ip = ["*"];
      }
      # GitHub Actions: SSH to the builders only (3022 is mm4-builder).
      {
        src = ["tag:ci"];
        dst = ["tag:gha-target"];
        ip = ["22" "3022"];
      }
      # Shared with waallinger@gmail.com: LiteLLM only.
      {
        src = ["waallinger@gmail.com"];
        dst = ["squadbook"];
        ip = ["tcp:4000"];
      }
    ];

    ssh = [
      {
        action = "check";
        src = ["autogroup:member"];
        dst = ["autogroup:self"];
        users = ["autogroup:nonroot" "root"];
      }
    ];

    tests = [
      {
        src = "waallinger@gmail.com";
        accept = ["squadbook:4000"];
        deny = ["squadbook:6767" "squadbook:22" "squadbook:5000" "squadbook:7000"];
      }
      {
        src = "truelecter@github";
        accept = ["squadbook:6767" "squadbook:22"];
      }
    ];
  };
in {
  terraform.required_providers.tailscale.source = "tailscale/tailscale";

  data.tailscale_device =
    lib.genAttrs (["squadbook"] ++ lib.attrNames tagged)
    (name: {name = "${name}.${domain}";});

  resource = {
    tailscale_acl.policy.acl = builtins.toJSON policy;

    tailscale_dns_preferences.tailnet.magic_dns = true;

    tailscale_device_tags =
      lib.mapAttrs (name: h: {
        device_id = nodeId name;
        inherit (h.tailscale) tags;
      })
      tagged;
  };

  import =
    [
      {
        to = "tailscale_acl.policy";
        id = "acl";
      }
      {
        to = "tailscale_dns_preferences.tailnet";
        id = "dns_preferences";
      }
    ]
    ++ lib.mapAttrsToList (name: _: {
      to = "tailscale_device_tags.${name}";
      id = nodeId name;
    })
    tagged;
}
