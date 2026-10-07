{
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
