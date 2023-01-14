# This file was generated by nvfetcher, please do not modify it manually.
{ fetchgit, fetchurl, fetchFromGitHub, dockerTools }:
{
  klipper = {
    pname = "klipper";
    version = "4671cf2d0e3ec864e72766cb1f6e24f1a308f794";
    src = fetchFromGitHub ({
      owner = "Klipper3d";
      repo = "klipper";
      rev = "4671cf2d0e3ec864e72766cb1f6e24f1a308f794";
      fetchSubmodules = false;
      sha256 = "sha256-OkOq+8cipcH2wAVwN+yrW83QxoUg3hXbrjk90VE1ZaA=";
    });
    date = "2023-01-13";
  };
  klipper-led_effect = {
    pname = "klipper-led_effect";
    version = "5d16b1c26b9e233a388b3126b59e54ee5fea709b";
    src = fetchFromGitHub ({
      owner = "julianschill";
      repo = "klipper-led_effect";
      rev = "5d16b1c26b9e233a388b3126b59e54ee5fea709b";
      fetchSubmodules = false;
      sha256 = "sha256-l9/I2YflDtiG72gL3rMy6SW8rD4iPJJ/IKDgrSVOi08=";
    });
    date = "2022-11-15";
  };
  klipper-screen = {
    pname = "klipper-screen";
    version = "b96adf55edd9389fc8f7e182a9104d790e86375a";
    src = fetchFromGitHub ({
      owner = "jordanruthe";
      repo = "KlipperScreen";
      rev = "b96adf55edd9389fc8f7e182a9104d790e86375a";
      fetchSubmodules = false;
      sha256 = "sha256-6LalpQhW5HmdNwrXGx4homLg0EDp0N7Y/cPNNYPkBFc=";
    });
    date = "2022-12-13";
  };
  libcamera = {
    pname = "libcamera";
    version = "5df5b72cf380bb66458a77f9a87378a91692fd9a";
    src = fetchFromGitHub ({
      owner = "raspberrypi";
      repo = "libcamera";
      rev = "5df5b72cf380bb66458a77f9a87378a91692fd9a";
      fetchSubmodules = false;
      sha256 = "sha256-9+cv1lDQR3M37cwztAFo8l3/rJsgPHGVNQq142Rcvh4=";
    });
    date = "2023-01-05";
  };
  libcamera-apps = {
    pname = "libcamera-apps";
    version = "29f39430958849da97f93382f750f9d17b0b48d4";
    src = fetchFromGitHub ({
      owner = "raspberrypi";
      repo = "libcamera-apps";
      rev = "29f39430958849da97f93382f750f9d17b0b48d4";
      fetchSubmodules = false;
      sha256 = "sha256-lp2HU0DudJtY5Si3xJkzvLLbZVCGgV1EJabkFwh3UCw=";
    });
    date = "2023-01-11";
  };
  mainsail = {
    pname = "mainsail";
    version = "v2.4.1";
    src = fetchurl {
      url = "https://github.com/mainsail-crew/mainsail/releases/download/v2.4.1/mainsail.zip";
      sha256 = "sha256-+g6RIfXn06qzDYcFSjZlxwXbwyWcGvf5++KbO59pu0M=";
    };
  };
  manix = {
    pname = "manix";
    version = "d08e7ca185445b929f097f8bfb1243a8ef3e10e4";
    src = fetchFromGitHub ({
      owner = "mlvzk";
      repo = "manix";
      rev = "d08e7ca185445b929f097f8bfb1243a8ef3e10e4";
      fetchSubmodules = false;
      sha256 = "sha256-GqPuYscLhkR5E2HnSFV4R48hCWvtM3C++3zlJhiK/aw=";
    });
    date = "2021-04-20";
  };
  moonraker = {
    pname = "moonraker";
    version = "a154c5fa512affa20d4290e7320f3be74b2365ff";
    src = fetchFromGitHub ({
      owner = "Arksine";
      repo = "moonraker";
      rev = "a154c5fa512affa20d4290e7320f3be74b2365ff";
      fetchSubmodules = false;
      sha256 = "sha256-+Wz3UI5x3e1A/eNLEuIzoYpvsnNEjuoBQGnBAl+9pII=";
    });
    date = "2023-01-12";
  };
  moonraker-telegram-bot = {
    pname = "moonraker-telegram-bot";
    version = "20333ad6fbd214bdd92cfca219adfa894d1f2758";
    src = fetchFromGitHub ({
      owner = "nlef";
      repo = "moonraker-telegram-bot";
      rev = "20333ad6fbd214bdd92cfca219adfa894d1f2758";
      fetchSubmodules = false;
      sha256 = "sha256-ND3BnVkBr0qLj1zMBH9P7E3GccBgb5zinCsq6SEW7Rk=";
    });
    date = "2023-01-12";
  };
  otf2bdf = {
    pname = "otf2bdf";
    version = "4fb7b6546c62e212475ecd61dee7d7255a60fc99";
    src = fetchFromGitHub ({
      owner = "jirutka";
      repo = "otf2bdf";
      rev = "4fb7b6546c62e212475ecd61dee7d7255a60fc99";
      fetchSubmodules = false;
      sha256 = "sha256-8z1uqUhUPK+fMW3PLkvF3eSlSJpo0x+6NQ6vYsEMqoM=";
    });
    date = "2021-09-18";
  };
  pam-reattach = {
    pname = "pam-reattach";
    version = "0fbdc4cebce66179cb2daee3d88944acd6cef505";
    src = fetchFromGitHub ({
      owner = "fabianishere";
      repo = "pam_reattach";
      rev = "0fbdc4cebce66179cb2daee3d88944acd6cef505";
      fetchSubmodules = false;
      sha256 = "sha256-9N944FcYM72hpTkT7jZoOoG7KfWvIhROHKXDh+dNTOQ=";
    });
    date = "2022-07-15";
  };
  python-networkmanager = {
    pname = "python-networkmanager";
    version = "2.2";
    src = fetchurl {
      url = "https://pypi.io/packages/source/p/python-networkmanager/python-networkmanager-2.2.tar.gz";
      sha256 = "sha256-3m65IdlKunVJ9CjtKzqkgqXVQ+y2lly6oPu1VasxudU=";
    };
  };
  rel = {
    pname = "rel";
    version = "cc9adca9e74c52bbfbf4512188948001049c1833";
    src = fetchFromGitHub ({
      owner = "bubbleboy14";
      repo = "registeredeventlistener";
      rev = "cc9adca9e74c52bbfbf4512188948001049c1833";
      fetchSubmodules = false;
      sha256 = "sha256-fg0EZ2jDjmuQNmFXnNmmi3/Jcufg0mb0IBNi3UXgiYk=";
    });
    date = "2021-12-13";
  };
  rpi-fw = {
    pname = "rpi-fw";
    version = "2e7137e0840f76f056589aba7f82d5b7236d8f1c";
    src = fetchFromGitHub ({
      owner = "raspberrypi";
      repo = "firmware";
      rev = "2e7137e0840f76f056589aba7f82d5b7236d8f1c";
      fetchSubmodules = false;
      sha256 = "sha256-jIKhQxp9D83OAZ8X2Vra9THHBE0j5Z2gRMDSVqIhopY=";
    });
    date = "2023-01-13";
  };
  rpi-fw-bluez = {
    pname = "rpi-fw-bluez";
    version = "9556b08ace2a1735127894642cc8ea6529c04c90";
    src = fetchFromGitHub ({
      owner = "RPi-Distro";
      repo = "bluez-firmware";
      rev = "9556b08ace2a1735127894642cc8ea6529c04c90";
      fetchSubmodules = false;
      sha256 = "sha256-gKGK0XzNrws5REkKg/JP6SZx3KsJduu53SfH3Dichkc=";
    });
    date = "2023-01-05";
  };
  rpi-fw-nonfree = {
    pname = "rpi-fw-nonfree";
    version = "8e349de20c8cb5d895b3568777ec53cbb333398f";
    src = fetchFromGitHub ({
      owner = "RPi-Distro";
      repo = "firmware-nonfree";
      rev = "8e349de20c8cb5d895b3568777ec53cbb333398f";
      fetchSubmodules = false;
      sha256 = "sha256-45/FnaaZTEG6jLmbaXohpNpS6BEZu3DBDHqquq8ukXc=";
    });
    date = "2023-01-11";
  };
  rpi-linux = {
    pname = "rpi-linux";
    version = "da4c8e0ffe7a868b989211045657d600be3046a1";
    src = fetchFromGitHub ({
      owner = "raspberrypi";
      repo = "linux";
      rev = "da4c8e0ffe7a868b989211045657d600be3046a1";
      fetchSubmodules = false;
      sha256 = "sha256-hNLVfhalmRhhRfvu2mR/qDmmGl//Ic1eqR7N1HFj2CY=";
    });
    date = "2023-01-13";
  };
  rtsp-simple-server = {
    pname = "rtsp-simple-server";
    version = "79562b15ab342bb34d29ffc3cae6a076ed51490a";
    src = fetchFromGitHub ({
      owner = "aler9";
      repo = "rtsp-simple-server";
      rev = "79562b15ab342bb34d29ffc3cae6a076ed51490a";
      fetchSubmodules = false;
      sha256 = "sha256-ouHkxWLcGGKKKdNTs2qSzuaUGAW73vxvq9EbgiXpzsg=";
    });
  };
  s5cmd = {
    pname = "s5cmd";
    version = "83ce8bc6a1016bcea46da48e9090f8e761478149";
    src = fetchFromGitHub ({
      owner = "peak";
      repo = "s5cmd";
      rev = "83ce8bc6a1016bcea46da48e9090f8e761478149";
      fetchSubmodules = false;
      sha256 = "sha256-8WoIUTRd2Ooot70hsAYVz9bEKKkK9Hs279RL+8D2Qfk=";
    });
    date = "2022-09-20";
  };
  tfenv = {
    pname = "tfenv";
    version = "1ccfddb22005b34eacaf06a9c33f58f14e816ec9";
    src = fetchFromGitHub ({
      owner = "tfutils";
      repo = "tfenv";
      rev = "1ccfddb22005b34eacaf06a9c33f58f14e816ec9";
      fetchSubmodules = false;
      sha256 = "sha256-UNvLJQB47IRcNZpoUGXTW2g63ApijnIB3oUb7Zu4lUY=";
    });
    date = "2022-10-01";
  };
  transmissionic = {
    pname = "transmissionic";
    version = "v1.7.1";
    src = fetchurl {
      url = "https://github.com/6c65726f79/Transmissionic/releases/download/v1.7.1/Transmissionic-webui-v1.7.1.zip";
      sha256 = "sha256-uAXoSvwVGb6+aSiJ5VKJUab0MzcQKCxYfkoDbhqWmfo=";
    };
  };
  wsaccel = {
    pname = "wsaccel";
    version = "0.6.4";
    src = fetchurl {
      url = "https://pypi.io/packages/source/w/wsaccel/wsaccel-0.6.4.tar.gz";
      sha256 = "sha256-y/ZqiLyvbGrRbVDqKSFYkVJrbpk8S8ftRLBE7m/jrT0=";
    };
  };
  zig = {
    pname = "zig";
    version = "d42a719e8f7ba31a9e18d6be9d58691b0b38c69a";
    src = fetchFromGitHub ({
      owner = "ziglang";
      repo = "zig";
      rev = "d42a719e8f7ba31a9e18d6be9d58691b0b38c69a";
      fetchSubmodules = false;
      sha256 = "sha256-FwXvZBpe7rSKte17TkeeQs4is2/nsYyi9oxcv/09NSY=";
    });
  };
}
