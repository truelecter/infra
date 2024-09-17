# This file was generated by nvfetcher, please do not modify it manually.
{ fetchgit, fetchurl, fetchFromGitHub, dockerTools }:
{
  camera-streamer = {
    pname = "camera-streamer";
    version = "v0.2.8";
    src = fetchFromGitHub {
      owner = "ayufan";
      repo = "camera-streamer";
      rev = "v0.2.8";
      fetchSubmodules = true;
      sha256 = "sha256-8vV8BMFoDeh22I1/qxk6zttJROaD/lrThBxXHZSPpT4=";
    };
  };
  danger-klipper = {
    pname = "danger-klipper";
    version = "e518840625e1f31116519e1239e4688f0b63413d";
    src = fetchFromGitHub {
      owner = "DangerKlippers";
      repo = "danger-klipper";
      rev = "e518840625e1f31116519e1239e4688f0b63413d";
      fetchSubmodules = false;
      sha256 = "sha256-s2GTYQE5oqpxDqtpu8bytOztuqz+E4XhxG+YsKaphLc=";
    };
    date = "2024-09-11";
  };
  experimental-danger-klipper = {
    pname = "experimental-danger-klipper";
    version = "762e6fc929e4900872005f1aadb2390ced720091";
    src = fetchFromGitHub {
      owner = "DangerKlippers";
      repo = "danger-klipper";
      rev = "762e6fc929e4900872005f1aadb2390ced720091";
      fetchSubmodules = false;
      sha256 = "sha256-eetI8vvxgtGAIZv1AX6derzJNPiebktZGFIQB9jxCHI=";
    };
    date = "2024-08-31";
  };
  katapult = {
    pname = "katapult";
    version = "90eb71b610669aaaab5ed3705c5b6361ac50dbb6";
    src = fetchFromGitHub {
      owner = "Arksine";
      repo = "katapult";
      rev = "90eb71b610669aaaab5ed3705c5b6361ac50dbb6";
      fetchSubmodules = false;
      sha256 = "sha256-Dzkk/54wupwx7TjZ1bHSSWEgE/vg6TEyGnb3A95co/Q=";
    };
    date = "2024-09-09";
  };
  klipper = {
    pname = "klipper";
    version = "0532a41c752df66f149cf55d779072f420ee1b6a";
    src = fetchFromGitHub {
      owner = "Klipper3d";
      repo = "klipper";
      rev = "0532a41c752df66f149cf55d779072f420ee1b6a";
      fetchSubmodules = false;
      sha256 = "sha256-8EGfBaaQnqqAVAwiwF4C2oUrXPLXo41+Vx4cRgcm4hE=";
    };
    date = "2024-09-16";
  };
  klipper-cartographer = {
    pname = "klipper-cartographer";
    version = "8fe3ee10438480e60cee52a70567b0904bc2ed51";
    src = fetchFromGitHub {
      owner = "Cartographer3D";
      repo = "cartographer-klipper";
      rev = "8fe3ee10438480e60cee52a70567b0904bc2ed51";
      fetchSubmodules = false;
      sha256 = "sha256-DYMS2qflysr2SDXRAUqxXqDExBUwBqtirq040g+D3aY=";
    };
    date = "2024-08-28";
  };
  klipper-chopper-resonance-tuner = {
    pname = "klipper-chopper-resonance-tuner";
    version = "1f98212ca9dbfdf15d516115dd4c26e97b914a8d";
    src = fetchFromGitHub {
      owner = "MRX8024";
      repo = "chopper-resonance-tuner";
      rev = "1f98212ca9dbfdf15d516115dd4c26e97b914a8d";
      fetchSubmodules = false;
      sha256 = "sha256-KLWWjHgEmQ9yJD6uUgjYieY8S1Td1qB5SaWN1znAGDk=";
    };
    date = "2024-08-23";
  };
  klipper-ercf = {
    pname = "klipper-ercf";
    version = "fb9a6c7daaf881ab507368386e733a800b26f595";
    src = fetchFromGitHub {
      owner = "EtteGit";
      repo = "EnragedRabbitProject";
      rev = "fb9a6c7daaf881ab507368386e733a800b26f595";
      fetchSubmodules = false;
      sha256 = "sha256-Gwi0HiCIlTBQkHlFnmG0sZWB2xA1y5maJxF7VdfQMxU=";
    };
    date = "2022-09-02";
  };
  klipper-gcode_shell_command = {
    pname = "klipper-gcode_shell_command";
    version = "4cf523a758fb2b18ac70a910532aeff6b8fbd6fc";
    src = fetchFromGitHub {
      owner = "dw-0";
      repo = "kiauh";
      rev = "4cf523a758fb2b18ac70a910532aeff6b8fbd6fc";
      fetchSubmodules = false;
      sha256 = "sha256-3HXSOvY+u3hAWLR66PBj7qCqqqABzqwsdrGLywFFfOk=";
    };
    date = "2024-09-08";
  };
  klipper-happy-hare = {
    pname = "klipper-happy-hare";
    version = "4950aa70dd7e673e3603cc9a4a5f1c0d2c8e5df9";
    src = fetchFromGitHub {
      owner = "moggieuk";
      repo = "Happy-Hare";
      rev = "4950aa70dd7e673e3603cc9a4a5f1c0d2c8e5df9";
      fetchSubmodules = false;
      sha256 = "sha256-Wyn8z4KQAA9kriLqp82XjcakQPe6/hFYPMK/slRbvBI=";
    };
    date = "2024-09-14";
  };
  klipper-kamp = {
    pname = "klipper-kamp";
    version = "v1.1.2";
    src = fetchFromGitHub {
      owner = "kyleisah";
      repo = "Klipper-Adaptive-Meshing-Purging";
      rev = "v1.1.2";
      fetchSubmodules = false;
      sha256 = "sha256-anBGjLtYlyrxeNVy1TEMcAGTVUFrGClLuoJZuo3xlDM=";
    };
  };
  klipper-klicky-probe = {
    pname = "klipper-klicky-probe";
    version = "64ad93af5e18f34216caf500e428a3f6df0a7a4d";
    src = fetchFromGitHub {
      owner = "truelecter";
      repo = "Klicky-Probe";
      rev = "64ad93af5e18f34216caf500e428a3f6df0a7a4d";
      fetchSubmodules = false;
      sha256 = "sha256-BbHkgJ8OlSF89BlSkWcpUEy8A6vPwAj6N4rvOQ7V2EQ=";
    };
    date = "2024-03-25";
  };
  klipper-klippain-shaketune = {
    pname = "klipper-klippain-shaketune";
    version = "66f5e32e4c8930afab278fcd898b47c227cc464c";
    src = fetchFromGitHub {
      owner = "Frix-x";
      repo = "klippain-shaketune";
      rev = "66f5e32e4c8930afab278fcd898b47c227cc464c";
      fetchSubmodules = false;
      sha256 = "sha256-qFW1BUeysVisDK2iP75vuTJa0nh8JatvZPp74HKPr74=";
    };
    date = "2024-07-01";
  };
  klipper-led_effect = {
    pname = "klipper-led_effect";
    version = "03a46eab5670c2934b38093993834f822a56c0fe";
    src = fetchFromGitHub {
      owner = "julianschill";
      repo = "klipper-led_effect";
      rev = "03a46eab5670c2934b38093993834f822a56c0fe";
      fetchSubmodules = false;
      sha256 = "sha256-eq6nTRQebWn+HvLh0wX6zCTx2Wcwal7RG71SDdj9isY=";
    };
    date = "2024-07-01";
  };
  klipper-nevermore-controller = {
    pname = "klipper-nevermore-controller";
    version = "14e308ff315029c2be0de498676fd23bae25ed98";
    src = fetchFromGitHub {
      owner = "SanaaHamel";
      repo = "nevermore-controller";
      rev = "14e308ff315029c2be0de498676fd23bae25ed98";
      fetchSubmodules = false;
      sha256 = "sha256-m9tSDKoU+w0+OESc2STiwa8vg9aKfxEvxnpqZjRDO5I=";
    };
    date = "2024-05-27";
  };
  klipper-nevermore-max = {
    pname = "klipper-nevermore-max";
    version = "159df10e4f6015680107d1cbd10a3aab23dd5f18";
    src = fetchFromGitHub {
      owner = "nevermore3d";
      repo = "Nevermore_Max";
      rev = "159df10e4f6015680107d1cbd10a3aab23dd5f18";
      fetchSubmodules = false;
      sha256 = "sha256-uPTUlI2F697pDPw5HxU48dEUpBkgovb61ksXW1HRfLY=";
    };
    date = "2023-11-18";
  };
  klipper-screen = {
    pname = "klipper-screen";
    version = "bdf03e8d6f69307d965e70a639318b244971dbac";
    src = fetchFromGitHub {
      owner = "jordanruthe";
      repo = "KlipperScreen";
      rev = "bdf03e8d6f69307d965e70a639318b244971dbac";
      fetchSubmodules = false;
      sha256 = "sha256-MxuUmkuEnfFC0iPwNUc0Wh8bIEl1J1FMgGEYMjHePZ8=";
    };
    date = "2024-09-16";
  };
  klipper-z-calibration = {
    pname = "klipper-z-calibration";
    version = "v1.1.2";
    src = fetchFromGitHub {
      owner = "protoloft";
      repo = "klipper_z_calibration";
      rev = "v1.1.2";
      fetchSubmodules = false;
      sha256 = "sha256-YNy3FmDa4kksweWrhnwa6WKQR3sDoBxtnGh9BoXEIGs=";
    };
  };
  klipper_tmc_autotune = {
    pname = "klipper_tmc_autotune";
    version = "489a1789d5ddb5510dcdd953aaa7780892d63f0e";
    src = fetchFromGitHub {
      owner = "andrewmcgr";
      repo = "klipper_tmc_autotune";
      rev = "489a1789d5ddb5510dcdd953aaa7780892d63f0e";
      fetchSubmodules = false;
      sha256 = "sha256-Gvv4ewf/BIOjuD3s0nMzq3uxnj0DIsaPRt0Rf0MnEIc=";
    };
    date = "2024-08-28";
  };
  libdatachannel0_17 = {
    pname = "libdatachannel0_17";
    version = "v0.17.10";
    src = fetchFromGitHub {
      owner = "paullouisageneau";
      repo = "libdatachannel";
      rev = "v0.17.10";
      fetchSubmodules = false;
      sha256 = "sha256-3f84GxAgQiObe+DYuTQABvK+RTihKKFKaf48lscUex4=";
    };
  };
  libjuice = {
    pname = "libjuice";
    version = "v1.0.4";
    src = fetchFromGitHub {
      owner = "paullouisageneau";
      repo = "libjuice";
      rev = "v1.0.4";
      fetchSubmodules = false;
      sha256 = "sha256-LAqi5F6okhGj0LyJasPKRkUz6InlM6rbYN+1sX1N4Qo=";
    };
  };
  live555 = {
    pname = "live555";
    version = "2020.03.06";
    src = fetchTarball {
      url = "https://download.videolan.org/pub/contrib/live555/live.2020.03.06.tar.gz";
      sha256 = "sha256-UxunbrJC6UVlwexso/cuH9m+mUSf7WEPMLincUrqDWE=";
    };
  };
  mainsail = {
    pname = "mainsail";
    version = "de697da87b0c77262c242034988114d01d4bd743";
    src = fetchFromGitHub {
      owner = "mainsail-crew";
      repo = "mainsail";
      rev = "de697da87b0c77262c242034988114d01d4bd743";
      fetchSubmodules = false;
      sha256 = "sha256-pllffDPf3t0C5q0kGIaaRLLyOl6YpvL2CRBw+EXXbhk=";
    };
    date = "2024-09-16";
  };
  mobileraker-companion = {
    pname = "mobileraker-companion";
    version = "1806404743e7af46a501e69d98ff3d27c3dafb82";
    src = fetchFromGitHub {
      owner = "Clon1998";
      repo = "mobileraker_companion";
      rev = "1806404743e7af46a501e69d98ff3d27c3dafb82";
      fetchSubmodules = false;
      sha256 = "sha256-qVZ5niOMlpTsAHo0T19QCYTtBHl+6Hh6qdUu2k4iXnA=";
    };
    date = "2024-09-07";
  };
  moonraker = {
    pname = "moonraker";
    version = "71f9e677b81afcc6b99dd5002f595025c38edc7b";
    src = fetchFromGitHub {
      owner = "Arksine";
      repo = "moonraker";
      rev = "71f9e677b81afcc6b99dd5002f595025c38edc7b";
      fetchSubmodules = false;
      sha256 = "sha256-g6YnDrQqA1ZvSbIjcjCMQqpko3pwe8yfFqSopDGB3Wg=";
    };
    date = "2024-09-05";
  };
  python-networkmanager = {
    pname = "python-networkmanager";
    version = "2.2";
    src = fetchurl {
      url = "https://pypi.org/packages/source/p/python-networkmanager/python-networkmanager-2.2.tar.gz";
      sha256 = "sha256-3m65IdlKunVJ9CjtKzqkgqXVQ+y2lly6oPu1VasxudU=";
    };
  };
  python-scheduler = {
    pname = "python-scheduler";
    version = "0.8.7";
    src = fetchurl {
      url = "https://pypi.org/packages/source/s/scheduler/scheduler-0.8.7.tar.gz";
      sha256 = "sha256-q1TWR0ZJZQxdBAsMwK4xTGNrEQ/Q3YMlSgSBvJNBXuU=";
    };
  };
  python-sqlalchemy-cockroachdb = {
    pname = "python-sqlalchemy-cockroachdb";
    version = "2.0.2";
    src = fetchurl {
      url = "https://pypi.org/packages/source/s/sqlalchemy-cockroachdb/sqlalchemy-cockroachdb-2.0.2.tar.gz";
      sha256 = "sha256-EZdW65BYVdahE0W5nP6FMDGj/lmKnEvzWo3ayfif6Mw=";
    };
  };
  spoolman = {
    pname = "spoolman";
    version = "v0.20.0";
    src = fetchurl {
      url = "https://github.com/Donkie/Spoolman/releases/download/v0.20.0/spoolman.zip";
      sha256 = "sha256-5m7oR8itUoODBlIST4IEmmDwEM5YCeQOYzhbqDBJeq8=";
    };
  };
}
