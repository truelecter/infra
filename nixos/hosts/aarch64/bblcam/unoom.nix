# https://gitlab.com/yajoman/minfra/-/blob/b3602cb9e4e7140de439d8f863f8e8b428497d52/modules/nixos/performance/default.nix
# https://discourse.nixos.org/t/nix-build-ate-my-ram/35752/11
{pkgs, ...}: {
  nix.daemonCPUSchedPolicy = "batch";
  nix.daemonIOSchedClass = "idle";
  nix.daemonIOSchedPriority = 7;

  # Slice to limit CPU and memory hogs
  # DOCS https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
  # DOCS https://discourse.nixos.org/t/nix-build-ate-my-ram/35752?u=yajo
  systemd.slices.anti-hungry.sliceConfig = {
    CPUAccounting = true;
    CPUQuota = "50%";
    MemoryAccounting = true; # Allow to control with systemd-cgtop
    MemoryHigh = "50%";
    MemoryMax = "75%";
    MemorySwapMax = "50%";
    MemoryZSwapMax = "50%";
  };

  systemd.services.nix-daemon.serviceConfig.Slice = "anti-hungry.slice";

  # Avoid freezing the system
  services.earlyoom.enable = true;
  services.earlyoom.enableNotifications = true; # Dangerous for more than 1 hacker per PC
  systemd.oomd.enable = true;
  systemd.oomd.enableRootSlice = true;
  systemd.oomd.enableSystemSlice = true;
  systemd.oomd.enableUserSlices = true;
  zramSwap.enable = true;
}
