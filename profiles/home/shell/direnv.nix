{
  xdg.configFile."direnv/direnv.toml".text = ''
    [global]
    warn_timeout = "2m"
  '';

  programs.direnv = {
    enable = true;
    nix-direnv = {
      enable = true;
    };
  };
}
