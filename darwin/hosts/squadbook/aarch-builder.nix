{
  nix.linux-builder = {
    enable = true;
    maxJobs = 8;

    config = {
      virtualisation = {
        cores = 8;
        darwin-builder = {
          diskSize = 100 * 1024;
          memorySize = 8 * 1024;
        };
      };
    };
  };
}
