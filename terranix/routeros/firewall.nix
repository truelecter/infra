# Root router only: the AP bridges every port and routes nothing.
{lib, ...}: let
  slug = s:
    lib.concatStringsSep "_" (lib.filter (p: lib.isString p && p != "")
      (builtins.split "[^a-z0-9]+" (lib.toLower (lib.removePrefix "defconf: " s))));

  interfaceLists = {
    LAN = ["bridge"];
    WAN = ["ether1"];
  };

  established = {
    action = "accept";
    connection_state = "established,related,untracked";
    comment = "defconf: accept established,related,untracked";
  };
  invalid = {
    action = "drop";
    connection_state = "invalid";
    comment = "defconf: drop invalid";
  };
  input = map (r: {chain = "input";} // r);
  forward = map (r: {chain = "forward";} // r);

  tables = {
    ip_firewall_filter =
      input [
        established
        invalid
        {
          action = "accept";
          protocol = "icmp";
          comment = "defconf: accept ICMP";
        }
        {
          action = "accept";
          dst_address = "127.0.0.1";
          comment = "defconf: accept to local loopback (for CAPsMAN)";
        }
        {
          action = "drop";
          in_interface_list = "!LAN";
          comment = "defconf: drop all not coming from LAN";
        }
      ]
      ++ forward [
        {
          action = "fasttrack-connection";
          connection_state = "established,related";
          comment = "defconf: fasttrack";
        }
        (established // {comment = "defconf: accept established,related, untracked";})
        invalid
        {
          action = "drop";
          connection_state = "new";
          connection_nat_state = "!dstnat";
          in_interface_list = "WAN";
          comment = "defconf: drop all from WAN not DSTNATed";
        }
      ];

    ip_firewall_nat = [
      {
        chain = "srcnat";
        action = "masquerade";
        ipsec_policy = "out,none";
        out_interface_list = "WAN";
        comment = "defconf: masquerade";
      }
    ];

    ipv6_firewall_filter = let
      dropNotLan = {
        action = "drop";
        in_interface_list = "!LAN";
        comment = "defconf: drop everything else not coming from LAN";
      };
    in
      input [
        established
        invalid
        {
          action = "accept";
          protocol = "icmpv6";
          comment = "defconf: accept ICMPv6";
        }
        dropNotLan
      ]
      ++ forward [established invalid dropNotLan];
  };

  # Rules are applied in list order. Resource names come from chain and
  # comment, so comments must be unique within a chain.
  ruleKey = r: "x290_router_${r.chain}_${slug r.comment}";
in {
  resource =
    lib.mapAttrs' (table: rules: let
      named = map (r: lib.nameValuePair (ruleKey r) r) rules;
    in
      assert lib.assertMsg (lib.allUnique (map (r: r.name) named)) "routeros: ${table} has rules with the same chain and comment";
        lib.nameValuePair "routeros_${table}" (lib.listToAttrs named))
    tables
    // {
      # RouterOS moves all but the last ID before the last one, so a table
      # with a single rule has nothing to order.
      routeros_move_items = lib.mapAttrs' (table: rules:
        lib.nameValuePair "x290_router_${table}" {
          resource_name = "routeros_${table}";
          sequence = map (r: "\${routeros_${table}.${ruleKey r}.id}") rules;
        })
      (lib.filterAttrs (_: rules: lib.length rules > 1) tables);

      routeros_interface_list = lib.mapAttrs' (list: _:
        lib.nameValuePair "x290_router_${lib.toLower list}" {
          name = list;
          comment = "defconf";
        })
      interfaceLists;

      routeros_interface_list_member = lib.concatMapAttrs (list: interfaces:
        lib.listToAttrs (map (interface:
          lib.nameValuePair "x290_router_${lib.toLower list}_${interface}" {
            list = "\${routeros_interface_list.x290_router_${lib.toLower list}.name}";
            inherit interface;
            comment = "defconf";
          })
        interfaces))
      interfaceLists;
    };
}
