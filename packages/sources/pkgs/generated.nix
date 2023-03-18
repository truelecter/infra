# This file was generated by nvfetcher, please do not modify it manually.
{ fetchgit, fetchurl, fetchFromGitHub, dockerTools }:
{
  cypress-aarch64 = {
    pname = "cypress-aarch64";
    version = "10.10.0";
    src = fetchurl {
      url = "https://cdn.cypress.io/desktop/10.10.0/linux-arm64/cypress.zip";
      sha256 = "sha256-izMbLdQj0B3/Bha9rjYlaLqdQvptJMrLBWGkz8abP8c=";
    };
  };
  klipper = {
    pname = "klipper";
    version = "c54d83c9f134d47f00da5ecd0d762e01748aaa59";
    src = fetchFromGitHub ({
      owner = "Klipper3d";
      repo = "klipper";
      rev = "c54d83c9f134d47f00da5ecd0d762e01748aaa59";
      fetchSubmodules = false;
      sha256 = "sha256-zPK1dzUFLQmno4A7jEStininVcYpUh0WAFjlAqnTLS0=";
    });
    date = "2023-03-15";
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
    version = "b963c55140ffd82ee9be9fb346d82b34329fcd00";
    src = fetchFromGitHub ({
      owner = "jordanruthe";
      repo = "KlipperScreen";
      rev = "b963c55140ffd82ee9be9fb346d82b34329fcd00";
      fetchSubmodules = false;
      sha256 = "sha256-IIbyennF9DydcE9LWWnhUhAlAi03y7D9lxY+UWI5jck=";
    });
    date = "2023-03-17";
  };
  libcamera = {
    pname = "libcamera";
    version = "923f5d707bb760bd3e724b3373568fa88c68454f";
    src = fetchFromGitHub ({
      owner = "raspberrypi";
      repo = "libcamera";
      rev = "923f5d707bb760bd3e724b3373568fa88c68454f";
      fetchSubmodules = false;
      sha256 = "sha256-G7K161m8VovKJTz1u+62irhLz9Y3C9PzKZhl6UMRFv4=";
    });
    date = "2023-03-02";
  };
  libcamera-apps = {
    pname = "libcamera-apps";
    version = "21157c5001a0a090cbd69c9e04c3a9dcfdfa8617";
    src = fetchFromGitHub ({
      owner = "raspberrypi";
      repo = "libcamera-apps";
      rev = "21157c5001a0a090cbd69c9e04c3a9dcfdfa8617";
      fetchSubmodules = false;
      sha256 = "sha256-t7f5GqdRqOHwRDD6dTWV3jUIFeSqMGsypdIDIV9eR6A=";
    });
    date = "2023-03-10";
  };
  mainsail = {
    pname = "mainsail";
    version = "v2.5.0";
    src = fetchurl {
      url = "https://github.com/mainsail-crew/mainsail/releases/download/v2.5.0/mainsail.zip";
      sha256 = "sha256-GC9OCKCl9iO+iE9vURqp6rpV5GLS8X8Ah2C++Bvuawg=";
    };
  };
  mainsail-raw = {
    pname = "mainsail-raw";
    version = "7ad25e38515bfde3e47ba7a01b3c16c01d1174a6";
    src = fetchFromGitHub ({
      owner = "mainsail-crew";
      repo = "mainsail";
      rev = "7ad25e38515bfde3e47ba7a01b3c16c01d1174a6";
      fetchSubmodules = false;
      sha256 = "sha256-SQwxMNIYfr7yU/FqkRdbNJ0YiAGYg2qDEwyAzvoecz0=";
    });
    date = "2023-03-12";
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
    version = "80920dd8723b7dac6d176500fed88d81149f22b2";
    src = fetchFromGitHub ({
      owner = "Arksine";
      repo = "moonraker";
      rev = "80920dd8723b7dac6d176500fed88d81149f22b2";
      fetchSubmodules = false;
      sha256 = "sha256-nsekJZG/wXrG0pJKJuF2+jSTxwrSVVRDm77egrsfkPw=";
    });
    date = "2023-03-05";
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
    version = "26d62ef6ebaf3e84c90363b579e0885ab1d458b8";
    src = fetchFromGitHub ({
      owner = "bubbleboy14";
      repo = "registeredeventlistener";
      rev = "26d62ef6ebaf3e84c90363b579e0885ab1d458b8";
      fetchSubmodules = false;
      sha256 = "sha256-SDW3W8wCq/5ci4qOvPlclbBg9dlhKyXHz8vZ/Rb9qk0=";
    });
    date = "2023-03-16";
  };
  rpi-fw = {
    pname = "rpi-fw";
    version = "a585b376a2e7e657287543d196ae1f8881ede559";
    src = fetchFromGitHub ({
      owner = "raspberrypi";
      repo = "firmware";
      rev = "a585b376a2e7e657287543d196ae1f8881ede559";
      fetchSubmodules = false;
      sha256 = "sha256-Z3ypa82CO3b9+ycPecI0uORYsiCWHdTqrAd5/WgYbG4=";
    });
    date = "2023-03-17";
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
    version = "v1.8.0";
    src = fetchurl {
      url = "https://github.com/6c65726f79/Transmissionic/releases/download/v1.8.0/Transmissionic-webui-v1.8.0.zip";
      sha256 = "sha256-IhbJCv9SWjLspJYv6dBKrooGk+vA7sq1N3WzMne6PEw=";
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
