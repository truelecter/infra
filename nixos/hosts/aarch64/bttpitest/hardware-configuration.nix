{
  config,
  lib,
  pkgs,
  ...
}: {
  boot = {
    kernelPackages = pkgs.linuxPackages_bttPi2;

    # driver has no OF match table, so udev never autoloads it
    kernelModules = ["raspits_ft5426"];

    extraModulePackages = [
      (pkgs.raspits_ft5426.override {inherit (config.boot.kernelPackages) kernel;})
      (pkgs.tc358762-burst.override {inherit (config.boot.kernelPackages) kernel;})
    ];

    loader = {
      grub.enable = false;
      generic-extlinux-compatible = {
        enable = true;
        configurationLimit = 10;
        useGenerationDeviceTree = true;
      };
    };

    consoleLogLevel = 8;
    initrd.availableKernelModules = lib.mkForce [
      "xhci_pci"
      "uas"
      "usbhid"
      "usb_storage"
      # "sdhci_pci"
      "mmc_block"

      # "ahci_dwc"
      "phy_rockchip_naneng_combphy"
    ];
    kernelParams = [
      "console=ttyS2,1500000n8"
      "console=tty1"
      # "video=DSI-1:800x480@56.06"
      # "drm.debug=0x1f"
    ];
  };

  rockchip.uBoot = pkgs.uboot-btt;

  fileSystems = {
    "/" = {
      device = lib.mkForce "/dev/disk/by-label/NIXOS_SD";
      fsType = "ext4";
    };
  };

  hardware.deviceTree = {
    enable = true;

    name = "rockchip/rk3566-bigtreetech-pi2.dtb";
    filter = "rk3566-bigtreetech-pi2.dtb";

    overlays = [
      {
        name = "btt-pitft";
        dtsFile = ./btt-pitft.dtso;
      }
      # {
      #   name = "opp";
      #   dtsFile = ./opp.dts;
      # }
    ];
  };

  system.nixos.tags = ["K${config.boot.kernelPackages.kernel.version}"];

  environment.etc."uboot/uboot-rockchip.bin".source = "${config.rockchip.uBoot}/u-boot-rockchip.bin";

  powerManagement.cpuFreqGovernor = "schedutil";

  systemd.services."irqbalance-oneshot" = {
    enable = true;
    description = "Distribute interrupts after boot using \"irqbalance --oneshot\"";
    documentation = ["man:irqbalance"];
    wantedBy = ["sysinit.target"];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      ExecStart = "${pkgs.irqbalance.out}/bin/irqbalance --foreground --oneshot";
    };
  };

  # The panel ATtiny can answer its first ID read with garbage after a warm
  # reboot; rpi-panel-attiny-regulator then fails with -ENODEV and never retries,
  # leaving the bridge and panel unprobed. Re-bind until the driver sticks.
  systemd.services."attiny-panel-rebind" = {
    description = "Retry probing the DSI panel ATtiny regulator";
    wantedBy = ["multi-user.target"];
    after = ["systemd-modules-load.service"];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
    };
    script = ''
      dev=/sys/bus/i2c/devices/2-0045
      drv=/sys/bus/i2c/drivers/rpi_touchscreen_attiny
      for _ in $(seq 1 10); do
        [ -e "$dev/driver" ] && exit 0
        [ -e "$drv/bind" ] && echo 2-0045 > "$drv/bind" || true
        sleep 1
      done
      echo "ATtiny at 2-0045 still unbound" >&2
      exit 1
    '';
  };

  hardware.enableRedistributableFirmware = true;

  environment.systemPackages = [
    pkgs.i2c-tools
  ];
}
