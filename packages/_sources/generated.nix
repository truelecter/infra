# This file was generated by nvfetcher, please do not modify it manually.
{
  fetchgit,
  fetchurl,
  fetchFromGitHub,
}: {
  klipper = {
    pname = "klipper";
    version = "ebc3b0def3091e015d328ded88ec0fc53b7eba79";
    src = fetchFromGitHub {
      owner = "Klipper3d";
      repo = "klipper";
      rev = "ebc3b0def3091e015d328ded88ec0fc53b7eba79";
      fetchSubmodules = false;
      sha256 = "sha256-xNq4LLuWD5DXAVGjuLBtngjnzvQaGfttjOYIiRJgCXs=";
    };
    date = "2022-10-21";
  };
  klipper-screen = {
    pname = "klipper-screen";
    version = "1332045128082a1bf5e8469bf542738527cb372e";
    src = fetchFromGitHub {
      owner = "jordanruthe";
      repo = "KlipperScreen";
      rev = "1332045128082a1bf5e8469bf542738527cb372e";
      fetchSubmodules = false;
      sha256 = "sha256-AzJ7FDEX6qQq+8bzWvNcMnR/5LFKg62SEIam+jlAuuQ=";
    };
    date = "2022-10-15";
  };
  libcamera = {
    pname = "libcamera";
    version = "e68e0f1ed2880ea26b5e317f94e2bbd5332e1598";
    src = fetchFromGitHub {
      owner = "raspberrypi";
      repo = "libcamera";
      rev = "e68e0f1ed2880ea26b5e317f94e2bbd5332e1598";
      fetchSubmodules = false;
      sha256 = "sha256-maeLpR3zNuSROlaGAYZMJ/Bp1GodWIchXNkjLgRrY6Y=";
    };
  };
  libcamera-apps = {
    pname = "libcamera-apps";
    version = "6bade0b112aca37fd9762d180203e376867ff09c";
    src = fetchFromGitHub {
      owner = "raspberrypi";
      repo = "libcamera-apps";
      rev = "6bade0b112aca37fd9762d180203e376867ff09c";
      fetchSubmodules = false;
      sha256 = "sha256-K57+9YTZNLHi0ljabDm1r/h5nkAIvS7Gvj25e+rcpcs=";
    };
  };
  mainsail = {
    pname = "mainsail";
    version = "v2.3.1";
    src = fetchurl {
      url = "https://github.com/mainsail-crew/mainsail/releases/download/v2.3.1/mainsail.zip";
      sha256 = "sha256-WRBxWCrHhAgtarjEU8izAuUBZTxOoQxZ+MjzCQ0C3P4=";
    };
  };
  manix = {
    pname = "manix";
    version = "d08e7ca185445b929f097f8bfb1243a8ef3e10e4";
    src = fetchFromGitHub {
      owner = "mlvzk";
      repo = "manix";
      rev = "d08e7ca185445b929f097f8bfb1243a8ef3e10e4";
      fetchSubmodules = false;
      sha256 = "sha256-GqPuYscLhkR5E2HnSFV4R48hCWvtM3C++3zlJhiK/aw=";
    };
    date = "2021-04-20";
  };
  moonraker = {
    pname = "moonraker";
    version = "779997c2b8aa1df2b484440ef1d3a6b09058fcff";
    src = fetchFromGitHub {
      owner = "Arksine";
      repo = "moonraker";
      rev = "779997c2b8aa1df2b484440ef1d3a6b09058fcff";
      fetchSubmodules = false;
      sha256 = "sha256-o8CPQFpPl9oT6mavaQe5YqnzRDOMNqHGMJqhgeSmE7c=";
    };
    date = "2022-10-22";
  };
  rpi-fw = {
    pname = "rpi-fw";
    version = "42e091c8e7edb79b5a6b493daaea2485d621d9e5";
    src = fetchFromGitHub {
      owner = "raspberrypi";
      repo = "firmware";
      rev = "42e091c8e7edb79b5a6b493daaea2485d621d9e5";
      fetchSubmodules = false;
      sha256 = "sha256-L93AYakaP5yASYbpYYSMLdLpDS5d4WUzt0xCY45Rbpg=";
    };
    date = "2022-10-21";
  };
  rpi-fw-bluez = {
    pname = "rpi-fw-bluez";
    version = "90d0bdffd25cc8a1717d3fec6cc7bbde56ee83c7";
    src = fetchFromGitHub {
      owner = "RPi-Distro";
      repo = "bluez-firmware";
      rev = "90d0bdffd25cc8a1717d3fec6cc7bbde56ee83c7";
      fetchSubmodules = false;
      sha256 = "sha256-BXvdkqUk45BmtSt2vuqiT5MljjUhX60l3/tBvZqjpGg=";
    };
    date = "2022-10-18";
  };
  rpi-fw-nonfree = {
    pname = "rpi-fw-nonfree";
    version = "d9c88346cab86e23394ebf6cb6cb3069602d29f4";
    src = fetchFromGitHub {
      owner = "RPi-Distro";
      repo = "firmware-nonfree";
      rev = "d9c88346cab86e23394ebf6cb6cb3069602d29f4";
      fetchSubmodules = false;
      sha256 = "sha256-1OqFWJMcQnQ03HXB2Kb2Tni+iao6Si3D5s/H1jLaK00=";
    };
    date = "2022-07-14";
  };
  rpi-linux = {
    pname = "rpi-linux";
    version = "dbd073e4028580a09b6ee507e0c137441cb52650";
    src = fetchFromGitHub {
      owner = "raspberrypi";
      repo = "linux";
      rev = "dbd073e4028580a09b6ee507e0c137441cb52650";
      fetchSubmodules = false;
      sha256 = "sha256-GukSJ+WHY+R0dZeCfqqXqdw97HVmqD5HeizgqMnQd8M=";
    };
    date = "2022-10-17";
  };
  rtsp-simple-server = {
    pname = "rtsp-simple-server";
    version = "85ce12199aa324a8399407aac41f8b2fbaad279d";
    src = fetchFromGitHub {
      owner = "aler9";
      repo = "rtsp-simple-server";
      rev = "85ce12199aa324a8399407aac41f8b2fbaad279d";
      fetchSubmodules = false;
      sha256 = "sha256-egmTcEhfBxUw8fOpcft0Sna7zXxAfI264yZECDpWYQE=";
    };
  };
  s5cmd = {
    pname = "s5cmd";
    version = "83ce8bc6a1016bcea46da48e9090f8e761478149";
    src = fetchFromGitHub {
      owner = "peak";
      repo = "s5cmd";
      rev = "83ce8bc6a1016bcea46da48e9090f8e761478149";
      fetchSubmodules = false;
      sha256 = "sha256-8WoIUTRd2Ooot70hsAYVz9bEKKkK9Hs279RL+8D2Qfk=";
    };
    date = "2022-09-20";
  };
  tfenv = {
    pname = "tfenv";
    version = "1ccfddb22005b34eacaf06a9c33f58f14e816ec9";
    src = fetchFromGitHub {
      owner = "tfutils";
      repo = "tfenv";
      rev = "1ccfddb22005b34eacaf06a9c33f58f14e816ec9";
      fetchSubmodules = false;
      sha256 = "sha256-UNvLJQB47IRcNZpoUGXTW2g63ApijnIB3oUb7Zu4lUY=";
    };
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
}
