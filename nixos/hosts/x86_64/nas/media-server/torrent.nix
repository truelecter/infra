{
  inputs,
  pkgs,
  suites,
  profiles,
  ...
}: {
  nixarr.transmission = {
    enable = true;
    # peerPort = 50000; # Set this to the port forwarded by your VPN
    flood.enable = true;
    extraAllowedIps = builtins.genList (x: "100.${builtins.toString (x + 64)}.*") 64; # tailscale 100.64.0.0/10
    # messageLevel = "trace";
    extraSettings = {
      rpc-host-whitelist-enabled = false; # FIXME: enable after setting up proper hostnames
    };
    # privateTrackers.cross-seed = {
    #   enable = true;
    # };
  };
}
