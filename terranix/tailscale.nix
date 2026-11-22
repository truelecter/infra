{
  lib,
  catalog,
  ...
}: let
  inherit (catalog.networks.tailscale) domain;

  tagged = lib.filterAttrs (_: h: h.tailscale.tags != []) catalog.hosts;

  # The node ID of a host's device; its addresses come from the catalog.
  nodeId = name: "\${data.tailscale_device.${name}.node_id}";

  policy = {
    tagOwners =
      lib.genAttrs
      (lib.unique (["tag:ci"] ++ lib.concatMap (h: h.tailscale.tags) (lib.attrValues catalog.hosts)))
      (_: []);

    hosts.squadbook = catalog.hosts.squadbook.net.tailscale.ip;

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
      # GitHub Actions: SSH to the builders and their Linux builder VMs only.
      {
        src = ["tag:ci"];
        dst = ["tag:gha-target"];
        ip = ["22"] ++ lib.unique (lib.concatMap (h: lib.optional (h.linuxBuilder.sshPort != null) (toString h.linuxBuilder.sshPort)) (lib.attrValues tagged));
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

  # Every catalog node on the tailnet. The plan fails when Tailscale gave one
  # a different address than the catalog has, such as after it joined again.
  data.tailscale_device = lib.mapAttrs (name: n: {
    name = "${name}.${domain}";
    lifecycle.postcondition = [
      {
        condition = "\${contains(self.addresses, \"${n.net.tailscale.ip}\")}";
        error_message = "catalog has ${n.net.tailscale.ip} for ${name}, Tailscale has \${join(\", \", self.addresses)}";
      }
    ];
  }) (lib.filterAttrs (_: n: n.net ? tailscale) (catalog.hosts // catalog.devices));

  resource = {
    # Replaces the whole policy file; keep its comments in `policy` above.
    tailscale_acl.policy.acl = builtins.toJSON policy;

    tailscale_dns_preferences.tailnet.magic_dns = true;

    tailscale_device_tags =
      lib.mapAttrs (name: h: {
        device_id = nodeId name;
        inherit (h.tailscale) tags;
      })
      tagged;
  };
}
