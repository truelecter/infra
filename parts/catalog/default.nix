# Host catalog: facts about hosts, external devices, networks and services
# that more than one module needs (addresses, MACs, SSH ports, domains). It is data
# only and never reads nixosConfigurations or darwinConfigurations, so
# terranix, scripts and `nix eval --json .#catalog` use it without evaluating
# a host.
#
# NixOS and darwin modules get it as the `catalog` module argument. Reading
# `self.catalog` runs the checks at the bottom of this file.
{
  lib,
  config,
  self,
  ...
}: let
  inherit (lib) mkOption types;

  cfg = config.catalog;

  ipv4 = types.strMatching "([0-9]{1,3}\\.){3}[0-9]{1,3}";
  macAddress = types.strMatching "([0-9a-f]{2}:){5}[0-9a-f]{2}";

  network = types.submodule ({config, ...}: {
    options = {
      cidr = mkOption {
        type = types.strMatching "([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}";
        description = "IPv4 network, `address/prefix`.";
      };

      prefixLength = mkOption {
        type = types.ints.between 0 32;
        readOnly = true;
        default = lib.toInt (lib.last (lib.splitString "/" config.cidr));
        description = "Prefix length of `cidr`.";
      };

      nameservers = mkOption {
        type = types.listOf ipv4;
        default = [];
        description = "DNS servers for hosts on this network.";
      };

      domain = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = "DNS suffix of host names on this network, such as the MagicDNS tailnet name.";
      };

      subnetOf = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = "Network this one is a part of, such as one DHCP scope of a LAN. Addresses still name the parent network.";
      };

      dhcpPool = mkOption {
        type = types.nullOr (types.strMatching "([0-9]{1,3}\\.){3}[0-9]{1,3}-([0-9]{1,3}\\.){3}[0-9]{1,3}");
        default = null;
        description = "Range DHCP hands out dynamic addresses from, `first-last`.";
      };
    };
  });

  address = types.submodule {
    options = {
      ip = mkOption {
        type = types.nullOr ipv4;
        default = null;
        description = "Static or DHCP-reserved address.";
      };

      mac = mkOption {
        type = types.nullOr macAddress;
        default = null;
        description = "MAC address. With `ip` set, the network's DHCP server reserves `ip` for it.";
      };

      privateMac = mkOption {
        type = types.bool;
        default = false;
        description = "Like `mac`, but the MAC stays out of the repository: terranix reads it from `private_macs.<node>` in secrets/terraform.yaml.";
      };

      dhcp.nameservers = mkOption {
        type = types.listOf ipv4;
        default = [];
        description = "DNS servers DHCP hands to this address instead of the network's.";
      };
    };
  };

  nodeOptions = {
    description = mkOption {
      type = types.str;
      default = "";
    };

    net = mkOption {
      type = types.attrsOf address;
      default = {};
      description = "Address on each network, by `catalog.networks` name.";
    };
  };

  host = types.submodule ({name, ...}: {
    options =
      nodeOptions
      // {
        deploy.hostname = mkOption {
          type = types.str;
          default = name;
          description = "Address deploy-rs connects to.";
        };

        ssh.port = mkOption {
          type = types.port;
          default = 22;
          description = "SSH port deploy-rs connects to.";
        };

        nixpkgs = mkOption {
          type = types.enum ["stable" "latest"];
          default = "stable";
          description = "nixpkgs and home-manager branch: the release (`nixpkgs`, `home`) or unstable (`latest`, `home-unstable`). NixOS only.";
        };

        ci.build = mkOption {
          type = types.bool;
          default = true;
          description = "Whether CI builds this host.";
        };

        tailscale.tags = mkOption {
          type = types.listOf (types.strMatching "tag:[a-z0-9-]+");
          default = [];
          description = "Tailscale ACL tags of the host's device, applied by terranix.";
        };

        linuxBuilder.sshPort = mkOption {
          type = types.nullOr types.port;
          default = null;
          description = "Port on this host forwarded to the SSH of its Linux builder VM.";
        };
      };
  });

  device = types.submodule {options = nodeOptions;};

  service = types.submodule ({
    name,
    config,
    ...
  }: {
    options = {
      host = mkOption {
        type = types.str;
        description = "Catalog host that runs the service.";
      };

      via = mkOption {
        type = types.str;
        default = config.host;
        defaultText = "host";
        description = "Host or device the service's DNS record points at, such as a proxy in front of `host`.";
      };

      public = mkOption {
        type = types.bool;
        default = false;
        description = "Reached from the internet: the DNS record points at the public IP of `via` (secrets/terraform.yaml) through the Cloudflare proxy, not at its x290 address.";
      };

      domain = mkOption {
        type = types.str;
        description = "Base domain, usually one of `catalog.domains`.";
      };

      subdomain = mkOption {
        type = types.str;
        default = name;
      };

      fqdn = mkOption {
        type = types.str;
        readOnly = true;
        default = "${config.subdomain}.${config.domain}";
      };
    };
  });

  # Checks across entries, which the option types can't express.

  ipToInt = ip: lib.foldl' (acc: part: acc * 256 + lib.toInt part) 0 (lib.splitString "." ip);
  pow2 = n: lib.foldl' (acc: _: acc * 2) 1 (lib.range 1 n);
  inNetwork = net: ip: let
    size = pow2 (32 - net.prefixLength);
  in
    ipToInt ip / size == ipToInt (lib.head (lib.splitString "/" net.cidr)) / size;

  nodes = cfg.hosts // cfg.devices;

  addresses = lib.concatLists (lib.mapAttrsToList (node: n:
    lib.mapAttrsToList (netName: a: a // {inherit node netName;}) n.net)
  nodes);

  duplicates = key: what:
    lib.pipe addresses [
      (lib.filter (a: a.${key} != null))
      (lib.groupBy (a: "${a.netName} ${a.${key}}"))
      (lib.filterAttrs (_: as: lib.length as > 1))
      (lib.mapAttrsToList (k: as: "${what} ${k} is used by ${lib.concatMapStringsSep ", " (a: a.node) as}"))
    ];

  configured = lib.attrNames (self.nixosConfigurations // self.darwinConfigurations);

  errors =
    map (n: "${n} is both a host and a device") (lib.attrNames (lib.intersectAttrs cfg.hosts cfg.devices))
    ++ map (n: "host ${n} has no NixOS or darwin configuration") (lib.subtractLists configured (lib.attrNames cfg.hosts))
    ++ map (n: "configuration ${n} has no catalog.hosts entry") (lib.subtractLists (lib.attrNames cfg.hosts) configured)
    ++ lib.concatMap (a:
      if !(cfg.networks ? ${a.netName})
      then ["${a.node}: unknown network ${a.netName}"]
      else lib.optional (a.ip != null && !inNetwork cfg.networks.${a.netName} a.ip) "${a.node}: ${a.ip} is outside ${a.netName} (${cfg.networks.${a.netName}.cidr})")
    addresses
    ++ duplicates "ip" "address"
    ++ duplicates "mac" "MAC"
    ++ map (a: "${a.node}: ${a.netName} has both mac and privateMac") (lib.filter (a: a.mac != null && a.privateMac) addresses)
    ++ lib.concatLists (lib.mapAttrsToList (name: net: let
      parent = cfg.networks.${net.subnetOf};
      pool = lib.splitString "-" net.dhcpPool;
    in
      lib.optionals (net.subnetOf != null) (
        if !(cfg.networks ? ${net.subnetOf})
        then ["network ${name}: unknown parent network ${net.subnetOf}"]
        else lib.optional (!inNetwork parent (lib.head (lib.splitString "/" net.cidr))) "network ${name}: ${net.cidr} is outside ${net.subnetOf} (${parent.cidr})"
      )
      ++ lib.optional (net.dhcpPool != null && !lib.all (inNetwork net) pool) "network ${name}: DHCP pool ${net.dhcpPool} is outside ${net.cidr}")
    cfg.networks)
    ++ lib.concatLists (lib.mapAttrsToList (name: s:
      lib.optional (!(cfg.hosts ? ${s.host})) "service ${name}: unknown host ${s.host}"
      ++ lib.optional (!(nodes ? ${s.via})) "service ${name}: unknown host or device ${s.via}")
    cfg.services);
in {
  imports = [
    ./networks.nix
    ./hosts.nix
    ./devices.nix
    ./domains.nix
    ./services.nix
  ];

  options.catalog = {
    networks = mkOption {
      type = types.attrsOf network;
      default = {};
    };

    hosts = mkOption {
      type = types.attrsOf host;
      default = {};
      description = "Hosts this flake configures, one per NixOS or darwin configuration.";
    };

    devices = mkOption {
      type = types.attrsOf device;
      default = {};
      description = "Devices on the networks this flake doesn't configure: routers, switches, printers, IoT.";
    };

    domains = mkOption {
      type = types.attrsOf types.str;
      default = {};
      description = "Domains, by purpose.";
    };

    services = mkOption {
      type = types.attrsOf service;
      default = {};
      description = "Services reached by name, for vhosts, DNS records and SSO clients.";
    };
  };

  config.flake.catalog =
    lib.throwIf (errors != [])
    "catalog:\n${lib.concatMapStringsSep "\n" (e: "- ${e}") errors}"
    cfg;
}
