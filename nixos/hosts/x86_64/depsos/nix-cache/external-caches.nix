let
  cache = url: pubKey: {inherit url pubKey;};
in [
  (cache "https://cache.nixos.org" "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY=")
  (cache "https://nix-community.cachix.org" "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs=")
  (cache "https://cuda-maintainers.cachix.org" "cuda-maintainers.cachix.org-1:0dq3bujKpuEPMCX6U4WylrUDZ9JyUG0VpVZa7CNfq5E=")
  (cache "https://mic92.cachix.org" "mic92.cachix.org-1:gi8IhgiT3CYZnJsaW7fxznzTkMUOn1RY4GmXdT/nXYQ=")
  (cache "https://nrdxp.cachix.org" "nrdxp.cachix.org-1:Fc5PSqY2Jm1TrWfm88l6cvGWwz3s93c6IOifQWnhNW4=")
  (cache "https://truelecter.cachix.org" "truelecter.cachix.org-1:bWHkQ/OM0MLHB9L6gftyaawCrEYkeZyygAcuojwslE0=")
  (cache "https://nabam-nixos-rockchip.cachix.org" "nabam-nixos-rockchip.cachix.org-1:BQDltcnV8GS/G86tdvjLwLFz1WeFqSk7O9yl+DR0AVM=")
]
# urls = [
#   "https://cache.nixos.org"
#   "https://nix-community.cachix.org"
#   "https://cuda-maintainers.cachix.org"
#   "https://mic92.cachix.org"
#   "https://nrdxp.cachix.org"
#   "https://truelecter.cachix.org"
#   "https://nabam-nixos-rockchip.cachix.org"
#   "http://${config.services.atticd.settings.listen}/workflows"
# ];
# publicKeys = [
#   "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="
#   "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
#   "cuda-maintainers.cachix.org-1:0dq3bujKpuEPMCX6U4WylrUDZ9JyUG0VpVZa7CNfq5E="
#   "mic92.cachix.org-1:gi8IhgiT3CYZnJsaW7fxznzTkMUOn1RY4GmXdT/nXYQ="
#   "nrdxp.cachix.org-1:Fc5PSqY2Jm1TrWfm88l6cvGWwz3s93c6IOifQWnhNW4="
#   "truelecter.cachix.org-1:bWHkQ/OM0MLHB9L6gftyaawCrEYkeZyygAcuojwslE0="
#   "nabam-nixos-rockchip.cachix.org-1:BQDltcnV8GS/G86tdvjLwLFz1WeFqSk7O9yl+DR0AVM="
#   "workflows:LrcQCsRv7P/HRuE10RyaNGM/6qsPchf+xaUOcFLy/5E=" # View by issuing "attic cache info workflows"
# ];

