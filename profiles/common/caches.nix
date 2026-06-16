{
  nix.settings = {
    substituters = [
      "https://nix-proxy.tlctr.me"
      # "https://cache.nixos.org/" # already included in nix module
    ];
    trusted-public-keys = [
      "cuda-maintainers.cachix.org-1:0dq3bujKpuEPMCX6U4WylrUDZ9JyUG0VpVZa7CNfq5E="
      "mic92.cachix.org-1:gi8IhgiT3CYZnJsaW7fxznzTkMUOn1RY4GmXdT/nXYQ="
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
      "nrdxp.cachix.org-1:Fc5PSqY2Jm1TrWfm88l6cvGWwz3s93c6IOifQWnhNW4="
      "truelecter.cachix.org-1:bWHkQ/OM0MLHB9L6gftyaawCrEYkeZyygAcuojwslE0="
      "nabam-nixos-rockchip.cachix.org-1:BQDltcnV8GS/G86tdvjLwLFz1WeFqSk7O9yl+DR0AVM="
      "nix-proxy.tlctr.me:o0mf52dfc6glFzwRRquMmGaphNAidwF6L/q2IFyB9qk="
      "workflows:nGqDVYKhDZxnNXIemS1/Bq2+i1wwQ6GE/xG2OIiMNDw="
      # "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY=" # already included in nix module
    ];
  };
}
