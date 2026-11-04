{
  networking = {
    nat = {
      enable = true;
      externalInterface = "eth0";
      internalInterfaces = ["tailscale0"];
    };
  };
}
