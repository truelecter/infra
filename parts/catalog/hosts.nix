{
  catalog.hosts = {
    # x86_64-linux

    depsos = {
      description = "Server for publicly hosted services";
      ssh.port = 2265;
      net.wireguard.ip = "10.7.0.1";
      wireguard.publicKey = "BTc6Jjt1kcfPmI+0YH+XwiOFXifEz6LN4NqLxQJK/Qs=";
    };

    nas = {
      description = "NAS with some multimedia stuff";
      nixpkgs = "latest";
      net.x290 = {
        ip = "10.3.0.132";
        mac = "f4:b5:20:45:4d:2e";
      };
    };

    sirius = {
      description = "Home Assistant, 3D printer coordination, switch and DHCP for the x290 half it bridges";
      # br-switch; the Wi-Fi uplink takes a DHCP address from the router.
      net.x290.ip = "10.3.0.129";
    };

    tl-wsl.description = "WSL system";

    # aarch64-linux

    oracle = {
      description = "Game servers and remote builder";
      # GitHub Actions runners (tag:ci) reach it over SSH, see terranix/tailscale.nix.
      tailscale.tags = ["tag:gha-target"];
    };

    voron = {
      description = "Voron 2.4 300mm";
      net.x290 = {
        ip = "10.3.0.150";
        mac = "e4:5f:01:67:cc:6f";
      };
    };

    tiny-m = {
      description = "Tiny-M 150mm";
      net.x290 = {
        ip = "10.3.0.151";
        mac = "dc:a6:32:ff:8c:18";
      };
    };

    vzbot235 = {
      description = "VzBot 235";
      net.x290 = {
        ip = "10.3.0.153";
        mac = "d8:3a:dd:43:45:dc";
      };
    };

    bblcam.description = "Camera for the Bambu printer";

    bttpitest = {
      description = "BTT Pi 2 KlipperScreen test";
      ci.build = false;
    };

    # aarch64-darwin

    squadbook.description = "Main workstation";

    tl-mm4 = {
      description = "aarch64-darwin and aarch64-linux builder";
      net.x290 = {
        ip = "10.3.0.133";
        mac = "d0:11:e5:83:d8:9e";
      };
      tailscale.tags = ["tag:gha-target"];
    };
  };
}
