{config, ...}: {
  catalog.devices = {
    x290-router = {
      description = "Mikrotik hAP ax3, root router";
      net.x290.ip = "10.3.0.1";
      net.wireguard.ip = "10.7.0.3";
      wireguard.publicKey = "RkWLn9HW/dIm1mJuXNWJgPzDwrE88qBJ10cgCVBosQU=";
    };

    x290-ap = {
      description = "Mikrotik hAP ax3, access point";
      net.x290.ip = "10.3.0.24";
    };

    x290-unifi = {
      description = "Ubiquiti USW Flex 2.5G 8";
      net.x290 = {
        ip = "10.3.0.130";
        mac = "94:2a:6f:4e:e0:20";
      };
    };

    bbl = {
      description = "Bambu Lab printer";
      net.x290 = {
        ip = "10.3.0.152";
        mac = "64:e8:33:77:71:b0";
      };
    };

    oukitel-bp2000 = {
      description = "Oukitel BP2000 power station";
      net.x290 = {
        ip = "10.3.0.180";
        mac = "74:07:7e:67:6c:30";
        # sirius instead of the router.
        dhcp.nameservers = [config.catalog.hosts.sirius.net.x290.ip];
      };
    };
  };
}
