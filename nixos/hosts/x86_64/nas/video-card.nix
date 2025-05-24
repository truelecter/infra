{config, ...}: {
  hardware = {
    graphics = {
      enable = true;
      enable32Bit = true;
    };
    nvidia = {
      nvidiaSettings = false;
      open = true;
      # package = config.boot.kernelPackages.nvidiaPackages.beta;
    };
    nvidia-container-toolkit.enable = true;
  };

  services.xserver.videoDrivers = ["nvidia"];
}
