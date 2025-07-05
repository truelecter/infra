{pkgs, ...}: let
  l = builtins // pkgs.lib;

  sources = pkgs.callPackage ./sources/generated.nix {};

  listToMods = list:
    pkgs.lib.pipe list [
      (
        builtins.map (v: {
          inherit (v) name;
          value = v.src;
        })
      )
      builtins.listToAttrs
    ];

  engine-by-versions = engine:
    l.pipe engine [
      (builtins.groupBy (mod: mod.mc-version))
      (l.mapAttrs (_: v: (listToMods v)))
    ];

  mods = l.pipe sources [
    (l.filterAttrs (_: v: l.isAttrs v && l.hasAttr "mod" v))
    l.attrValues
    (builtins.groupBy (mod: mod.mod))
    (l.mapAttrs (k: engine-by-versions))
  ];
in {
  _module.args = {
    inherit mods;
  };

  imports = [
    ./dawncraft.nix
    ./e6e.nix
    ./e9e.nix
    ./sevtech.nix
    ./vanilla.nix
    ./litv3.nix
    ./cae.nix
    ./vh3.nix
  ];

  users = {
    groups = {
      minecraft-servers = {};
      minecraft-servers-backup = {};
    };
    users.truelecter.extraGroups = ["minecraft-servers"];
  };

  services.minecraft-servers = let
    bluemapConfig = port: ''
      enabled: true
      port: ${toString port}
      ip: "127.0.0.1"
      ##
    '';
  in {
    eula = true;
    users.extraGroups = ["minecraft-servers-backup"];

    instances.dawncraft.serverProperties = {
      server-port = 25566;
      rcon-port = 25596;
    };

    instances.e6e.serverProperties = {
      server-port = 25567;
      rcon-port = 25597;
    };

    instances.e9e = {
      customization.create."config/bluemap/webserver.conf".text = bluemapConfig 8112;
      serverProperties = {
        server-port = 25568;
        rcon-port = 25598;
      };
    };

    instances.litv3 = {
      customization.create."config/bluemap/webserver.conf".text = bluemapConfig 8109;
      serverProperties = {
        server-port = 25569;
        rcon-port = 25599;
      };
    };

    instances.cae = {
      customization.create."config/bluemap/webserver.conf".text = bluemapConfig 8110;
      serverProperties = {
        server-port = 25570;
        rcon-port = 25600;
      };
    };

    instances.vh3 = {
      customization.create."config/bluemap/webserver.conf".text = bluemapConfig 8111;
      serverProperties = {
        server-port = 25571;
        rcon-port = 25601;
      };
    };

    instances.sevtech.serverProperties = {
      server-port = 25565;
      rcon-port = 25595;
    };
  };

  services.minecraft-server.serverProperties.server-port = 25580;

  security.acme = {
    acceptTerms = true;
    defaults.email = "andrew.panassiouk@gmail.com";
  };

  services.nginx = {
    enable = true;
    virtualHosts = let
      bluemap = port: {
        enableACME = true;
        forceSSL = true;
        locations."/".proxyPass = "http://127.0.0.1:${toString port}";
      };
    in {
      "litv3.tenma.moe" = bluemap 8109;
      "cae.tenma.moe" = bluemap 8110;
      "vh3.tenma.moe" = bluemap 8111;
      "e9e.tenma.moe" = bluemap 8112;
    };
  };

  systemd.extraConfig = ''
    DefaultLimitNOFILE = 102400
    DefaultLimitNOFILESoft = 102400
  '';

  networking.firewall.allowedTCPPorts = [
    80
    443
  ];
}
