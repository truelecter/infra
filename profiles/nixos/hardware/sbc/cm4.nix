{
  imports = [
    ./rpi4.nix
  ];

  boot.initrd.availableKernelModules = [
    "sdhci_iproc"
  ];
}
