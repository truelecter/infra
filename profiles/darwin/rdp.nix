{inputs, ...}: {
  nix-homebrew.taps."otsge/homebrew-keg" = inputs.homebrew-otsge-keg;

  homebrew = {
    taps = ["otsge/keg"];
    casks = [
      {
        name = "otsge/keg/parsec-startup";
        trusted = true;
      }
    ];
  };
}
