let
  networks = {
    x290 = "10.3.0.0/24";
    tailscale = "100.67.0.0/10";
  };

  mkEntry = id: {
  };
  # partToInt = i: builtins.fromJSON (builtins.elemAt parts i);

  ipToInt = ip: let
    parts = builtins.match "([[:digit:]]+)\\.([[:digit:]]+)\\.([[:digit:]]+)\\.([[:digit:]]+)" ip;
  in
    builtins.foldl' (acc: part: acc * 256 + (builtins.fromJSON part)) 0 parts;
in {
}
