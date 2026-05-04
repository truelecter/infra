# https://gitlab.com/yajoman/minfra/-/blob/b3602cb9e4e7140de439d8f863f8e8b428497d52/modules/nixos/performance/default.nix
# https://discourse.nixos.org/t/nix-build-ate-my-ram/35752/11
{
  nix = {
    daemonCPUSchedPolicy = "batch";
    daemonIOSchedClass = "idle";
    daemonIOSchedPriority = 7;
  };

  # Slice to limit CPU and memory hogs
  # DOCS https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
  # DOCS https://discourse.nixos.org/t/nix-build-ate-my-ram/35752?u=yajo
  systemd = {
    slices.anti-hungry.sliceConfig = {
      CPUAccounting = true;
      CPUQuota = "50%";
      MemoryAccounting = true; # Allow to control with systemd-cgtop
      MemoryHigh = "50%";
      MemoryMax = "75%";
      MemorySwapMax = "50%";
      MemoryZSwapMax = "50%";
    };

    services.nix-daemon.serviceConfig.Slice = "anti-hungry.slice";

    oomd = {
      enable = true;
      enableRootSlice = true;
      enableSystemSlice = true;
      enableUserSlices = true;
    };
  };

  # Avoid freezing the system
  services.earlyoom = {
    enable = true;
    enableNotifications = true; # Dangerous for more than 1 hacker per PC
  };

  zramSwap.enable = true;
}
