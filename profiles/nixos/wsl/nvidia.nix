{lib, ...}: {
  wsl.useWindowsDriver = true;
  hardware.graphics.enable = true;

  # Windows' nvidia-smi and other foreign binaries run through nix-ld and look up libnvidia-ml/libcuda there.
  environment.sessionVariables.NIX_LD_LIBRARY_PATH = lib.mkForce "/run/current-system/sw/share/nix-ld/lib:/run/opengl-driver/lib";

  virtualisation.docker.daemon.settings.features.cdi = true;

  hardware.nvidia-container-toolkit = {
    enable = true;
    suppressNvidiaDriverAssertion = true;
    discovery-mode = "wsl";
  };
}
