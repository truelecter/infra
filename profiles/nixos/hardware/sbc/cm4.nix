{
  imports = [
    ./rpi4.nix
  ];

  hardware.deviceTree.filter = "bcm2711-rpi-cm4.dtb";

  boot.initrd.availableKernelModules = [
    "sdhci_iproc"
  ];
}
