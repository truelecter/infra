{config, ...}: {
  hardware = {
    graphics = {
      enable = true;
      enable32Bit = true;
    };
    nvidia = {
      nvidiaSettings = false;
      open = true;

      # Pin to 595.84 to avoid breaking runtive driver version
      # https://github.com/NixOS/nixpkgs/blob/nixpkgs-unstable/pkgs/os-specific/linux/nvidia-x11/default.nix
      package = config.boot.kernelPackages.nvidiaPackages.mkDriver {
        version = "595.84";
        sha256_64bit = "sha256-mcQE5SExvye8ptoCaNzOPr7cenOrF0BxqZXPGmxeugY=";
        sha256_aarch64 = "sha256-GloNdDFfmXFVu4FAlNNk2qzqLOuw2N5CKatKkcSrQxk=";
        openSha256 = "sha256-pEmA2tUcOKwUPKy6N0QvS49Pdut4/7Phs/JhjdyBcNY=";
        settingsSha256 = "sha256-QrnBM+sdWO4GanO62rxpHmRrjYkYpl5RD6fIiHq4C4A=";
        persistencedSha256 = "sha256-50xYdgx7EEThbaMp4QS8GADbxj0mhBXh8QQN0tWMwRg=";
      };
    };
    nvidia-container-toolkit.enable = true;
  };

  services.xserver.videoDrivers = ["nvidia"];
}
