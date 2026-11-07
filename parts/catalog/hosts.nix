{
  # Tailscale addresses: `net.tailscale.ip`, assigned by Tailscale when the
  # device joins and stable after that. A device that logs in again as a new
  # node gets a new one.
  catalog.hosts = {
    # x86_64-linux

    depsos = {
      description = "Server for publicly hosted services";
      ssh.port = 2265;
      net.tailscale.ip = "100.122.27.87";
    };

    nas = {
      description = "NAS with some multimedia stuff";
      nixpkgs = "latest";
      net.x290 = {
        ip = "10.3.0.132";
        mac = "f4:b5:20:45:4d:2e";
      };
      net.tailscale.ip = "100.76.115.34";
    };

    sirius = {
      description = "Home Assistant, 3D printer coordination, switch and DHCP for the x290 half it bridges";
      # br-switch; the Wi-Fi uplink takes a DHCP address from the router.
      net.x290.ip = "10.3.0.129";
      net.tailscale.ip = "100.77.131.122";
    };

    tl-wsl = {
      description = "WSL system";
      net.tailscale.ip = "100.67.12.111";
    };

    # aarch64-linux

    oracle = {
      description = "Game servers and remote builder";
      # GitHub Actions runners (tag:ci) reach it over SSH, see terranix/tailscale.nix.
      tailscale.tags = ["tag:gha-target"];
      net.tailscale.ip = "100.69.234.73";
    };

    voron = {
      description = "Voron 2.4 300mm";
      net.x290 = {
        ip = "10.3.0.150";
        mac = "e4:5f:01:67:cc:6f";
      };
      net.tailscale.ip = "100.118.123.75";
    };

    tiny-m = {
      description = "Tiny-M 150mm";
      net.x290 = {
        ip = "10.3.0.151";
        mac = "dc:a6:32:ff:8c:18";
      };
      net.tailscale.ip = "100.126.182.37";
    };

    vzbot235 = {
      description = "VzBot 235";
      net.x290 = {
        ip = "10.3.0.153";
        mac = "d8:3a:dd:43:45:dc";
      };
      net.tailscale.ip = "100.120.115.118";
    };

    bblcam = {
      description = "Camera for the Bambu printer";
      net.tailscale.ip = "100.69.100.75";
    };

    bttpitest = {
      description = "BTT Pi 2 KlipperScreen test";
      ci.build = false;
      net.tailscale.ip = "100.67.84.77";
    };

    # aarch64-darwin

    squadbook = {
      description = "Main workstation";
      net.tailscale.ip = "100.105.108.54";
    };

    tl-mm4 = {
      description = "aarch64-darwin and aarch64-linux builder";
      net.x290 = {
        ip = "10.3.0.133";
        mac = "d0:11:e5:83:d8:9e";
      };
      net.tailscale.ip = "100.92.245.57";
      tailscale.tags = ["tag:gha-target"];
      # mm4-builder, see tl-mm4/aarch-builder.nix.
      linuxBuilder.sshPort = 3022;
    };
  };
}
