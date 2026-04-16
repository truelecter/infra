{
  services.watchdogd = {
    enable = true;

    settings = {
      timeout = 10;
      interval = 5;
    };
  };
}
