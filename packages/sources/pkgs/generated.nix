# This file was generated by nvfetcher, please do not modify it manually.
{ fetchgit, fetchurl, fetchFromGitHub, dockerTools }:
{
  klipper = {
    pname = "klipper";
    version = "aca0c71a2b2eb1679923ca2491aadad38cc43081";
    src = fetchFromGitHub ({
      owner = "Klipper3d";
      repo = "klipper";
      rev = "aca0c71a2b2eb1679923ca2491aadad38cc43081";
      fetchSubmodules = false;
      sha256 = "sha256-r4HshUW0SbJW7tZYp0JfaOu0rWRMJZYuWQl7vZFvQFQ=";
    });
    date = "2023-02-14";
  };
  klipper-led_effect = {
    pname = "klipper-led_effect";
    version = "35cf587fe958fe15a07c11b60564856582890460";
    src = fetchFromGitHub ({
      owner = "julianschill";
      repo = "klipper-led_effect";
      rev = "35cf587fe958fe15a07c11b60564856582890460";
      fetchSubmodules = false;
      sha256 = "sha256-AZase17sO85Bp14DocUn+m6jT8P5ABXBJFdH7t4ANog=";
    });
    date = "2023-02-04";
  };
  klipper-screen = {
    pname = "klipper-screen";
    version = "e426b06b8be78d9a30965e62914d4f3e7d8cf5da";
    src = fetchFromGitHub ({
      owner = "jordanruthe";
      repo = "KlipperScreen";
      rev = "e426b06b8be78d9a30965e62914d4f3e7d8cf5da";
      fetchSubmodules = false;
      sha256 = "sha256-IDsHcKlhkiNfXU5U69fLLNY4Dr7JB8CAbSE8xR+gj0U=";
    });
    date = "2023-02-13";
  };
  libcamera = {
    pname = "libcamera";
    version = "9b860a664e9cd7ca4889c6f8d7f0e8d402199de3";
    src = fetchFromGitHub ({
      owner = "raspberrypi";
      repo = "libcamera";
      rev = "9b860a664e9cd7ca4889c6f8d7f0e8d402199de3";
      fetchSubmodules = false;
      sha256 = "sha256-qkSHyvV/7Ga6DJacQJs5wLYjkqF57HQtPv9JCqftruE=";
    });
    date = "2023-01-24";
  };
  libcamera-apps = {
    pname = "libcamera-apps";
    version = "e90d21d4c880ab3617a527fae69a7f83e5192cdc";
    src = fetchFromGitHub ({
      owner = "raspberrypi";
      repo = "libcamera-apps";
      rev = "e90d21d4c880ab3617a527fae69a7f83e5192cdc";
      fetchSubmodules = false;
      sha256 = "sha256-TneWuTKxzO7AB8/O5MUEcc4oLccy21FSExh226IQRgE=";
    });
    date = "2023-02-15";
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
    version = "0a811b9e44ff1d4b68836f75143d26d09fad5840";
    src = fetchFromGitHub ({
      owner = "Arksine";
      repo = "moonraker";
      rev = "0a811b9e44ff1d4b68836f75143d26d09fad5840";
      fetchSubmodules = false;
      sha256 = "sha256-YQ4hUxL6W6+GeECRDKGnGknD8H+BhFqfvBU/mNUDVZY=";
    });
    date = "2023-02-17";
  };
  moonraker-telegram-bot = {
    pname = "moonraker-telegram-bot";
    version = "b9b47003e13b8a23af696594aac8ba53c777f5a7";
    src = fetchFromGitHub ({
      owner = "nlef";
      repo = "moonraker-telegram-bot";
      rev = "b9b47003e13b8a23af696594aac8ba53c777f5a7";
      fetchSubmodules = false;
      sha256 = "sha256-kvr3Ywg1Mc4yJerNJochPiHBD20zcpPbB7n3HEDQzZA=";
    });
    date = "2023-02-05";
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
    version = "f3b57c98bf661dbc21ed4039a859fddf48d6ba75";
    src = fetchFromGitHub ({
      owner = "bubbleboy14";
      repo = "registeredeventlistener";
      rev = "f3b57c98bf661dbc21ed4039a859fddf48d6ba75";
      fetchSubmodules = false;
      sha256 = "sha256-J3nP6BLAa+/QcQTtVWa00Iu0JDb/AsobU59UQArlz7s=";
    });
    date = "2023-02-09";
  };
  rpi-fw = {
    pname = "rpi-fw";
    version = "cc64c94b50fa2120ef6f2825fb3105f6691197a6";
    src = fetchFromGitHub ({
      owner = "raspberrypi";
      repo = "firmware";
      rev = "cc64c94b50fa2120ef6f2825fb3105f6691197a6";
      fetchSubmodules = false;
      sha256 = "sha256-Sng24lerS++Wr4j/iM1zbMAjOEEsl4vf/lfwYxWkluI=";
    });
    date = "2023-02-10";
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
    version = "7f29411baead874b859eda53efdc2472345ea454";
    src = fetchFromGitHub ({
      owner = "RPi-Distro";
      repo = "firmware-nonfree";
      rev = "7f29411baead874b859eda53efdc2472345ea454";
      fetchSubmodules = false;
      sha256 = "sha256-54JKmwypD7PRQdd7k6IcF7wL8ifMavEM0UwZwmA24O4=";
    });
    date = "2023-01-25";
  };
  rpi-linux = {
    pname = "rpi-linux";
    version = "14b35093ca68bf2c81bbc90aace5007142b40b40";
    src = fetchFromGitHub ({
      owner = "raspberrypi";
      repo = "linux";
      rev = "14b35093ca68bf2c81bbc90aace5007142b40b40";
      fetchSubmodules = false;
      sha256 = "sha256-oy+VgoB4IdFZjGwkx88dDSpwWZj2D5t3PyXPIwDsY1Q=";
    });
    date = "2023-02-08";
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
    version = "3e080613218175bb7b1f62cf45cee16eee901792";
    src = fetchFromGitHub ({
      owner = "peak";
      repo = "s5cmd";
      rev = "3e080613218175bb7b1f62cf45cee16eee901792";
      fetchSubmodules = false;
      sha256 = "sha256-jhjptEDak591vziIj6CIc4I85MM73EVi+OyBAfFOtkg=";
    });
    date = "2023-02-02";
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
