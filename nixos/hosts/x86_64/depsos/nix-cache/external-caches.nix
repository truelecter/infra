let
  cache = url: pubKey: priority: {inherit url pubKey priority;};
in [
  (cache "https://cache.nixos.org" "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY=" 40)
  (cache "https://nix-community.cachix.org" "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs=" 40)
  (cache "https://cuda-maintainers.cachix.org" "cuda-maintainers.cachix.org-1:0dq3bujKpuEPMCX6U4WylrUDZ9JyUG0VpVZa7CNfq5E=" 50)
  (cache "https://mic92.cachix.org" "mic92.cachix.org-1:gi8IhgiT3CYZnJsaW7fxznzTkMUOn1RY4GmXdT/nXYQ=" 50)
  (cache "https://nrdxp.cachix.org" "nrdxp.cachix.org-1:Fc5PSqY2Jm1TrWfm88l6cvGWwz3s93c6IOifQWnhNW4=" 50)
  (cache "https://truelecter.cachix.org" "truelecter.cachix.org-1:bWHkQ/OM0MLHB9L6gftyaawCrEYkeZyygAcuojwslE0=" 50)
  (cache "https://nabam-nixos-rockchip.cachix.org" "nabam-nixos-rockchip.cachix.org-1:BQDltcnV8GS/G86tdvjLwLFz1WeFqSk7O9yl+DR0AVM=" 50)
]
