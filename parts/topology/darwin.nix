# nix-darwin hosts have no topology module, so they are declared here.
{config, ...}: let
  inherit (config.lib.topology) mkConnection mkDevice;

  tailscale0 = {
    virtual = true;
    network = "tailscale";
    type = "tailscale";
    physicalConnections = [(mkConnection "tailscale" "*")];
  };
in {
  nodes = {
    tl-mm4 = mkDevice "tl-mm4" {
      info = "Mac mini M4";
      deviceIcon = "devices.desktop";

      interfaces = {
        # Wired to the USW Flex, see routers.nix.
        en0.addresses = ["10.3.0.133"];
        inherit tailscale0;
      };
    };

    squadbook = mkDevice "squadbook" {
      info = "MacBook";
      deviceIcon = "devices.laptop";

      interfaces = {
        # Home Wi-Fi, see routers.nix.
        en0.type = "wifi";
        inherit tailscale0;
      };
    };
  };
}
