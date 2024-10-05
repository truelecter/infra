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
    version = "b2acb140feed93a75372dffb64785562275042b7";
    src = fetchFromGitHub {
      owner = "DangerKlippers";
      repo = "danger-klipper";
      rev = "b2acb140feed93a75372dffb64785562275042b7";
      fetchSubmodules = false;
      sha256 = "sha256-rm+wTtCitUV6m/atooW5PuhCO701U7uOnaDq3d+kBQc=";
    };
    date = "2024-10-02";
  };
  experimental-danger-klipper = {
    pname = "experimental-danger-klipper";
    version = "c8acb2878015dfd5b5878f10a50f00bd6f240c05";
    src = fetchFromGitHub {
      owner = "DangerKlippers";
      repo = "danger-klipper";
      rev = "c8acb2878015dfd5b5878f10a50f00bd6f240c05";
      fetchSubmodules = false;
      sha256 = "sha256-5iK03dZehS+z3945S+/+fKhDLV9rBti5X9o8pZQUNmk=";
    };
    date = "2024-10-02";
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
    version = "96cceed23efc7a3759ecfba0a228cdcb4d5244d3";
    src = fetchFromGitHub {
      owner = "Klipper3d";
      repo = "klipper";
      rev = "96cceed23efc7a3759ecfba0a228cdcb4d5244d3";
      fetchSubmodules = false;
      sha256 = "sha256-rnbCtOlODPnpb5o6hG8QBdZnsmO8H5NhUeHkYIVYKoA=";
    };
    date = "2024-10-01";
  };
  klipper-cartographer = {
    pname = "klipper-cartographer";
    version = "f52e31c3d4b84f0aae66cbe926f216c67a30c3bb";
    src = fetchFromGitHub {
      owner = "Cartographer3D";
      repo = "cartographer-klipper";
      rev = "f52e31c3d4b84f0aae66cbe926f216c67a30c3bb";
      fetchSubmodules = false;
      sha256 = "sha256-Yqya8gmtLsrG9XLec5S/IzeBtjaMyUC9BV7r8wEDuzM=";
    };
    date = "2024-10-03";
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
    version = "a8a73249a507a657a09b92410179d23f552a5829";
    src = fetchFromGitHub {
      owner = "dw-0";
      repo = "kiauh";
      rev = "a8a73249a507a657a09b92410179d23f552a5829";
      fetchSubmodules = false;
      sha256 = "sha256-mpUocSNUv41n9FFAWk2qzAcLiiZCTE+/7CmCw1Gj/HM=";
    };
    date = "2024-09-26";
  };
  klipper-happy-hare = {
    pname = "klipper-happy-hare";
    version = "d70ff2096d45b2564cacc0d23139b127cb2c1bc1";
    src = fetchFromGitHub {
      owner = "moggieuk";
      repo = "Happy-Hare";
      rev = "d70ff2096d45b2564cacc0d23139b127cb2c1bc1";
      fetchSubmodules = false;
      sha256 = "sha256-cbvz48kzHAsfTqf5yazvTngzG0YRADJExEkBOCwchHc=";
    };
    date = "2024-10-02";
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
    version = "56d1d48296f8242496d47d4b4c84c558a7bab2a5";
    src = fetchFromGitHub {
      owner = "julianschill";
      repo = "klipper-led_effect";
      rev = "56d1d48296f8242496d47d4b4c84c558a7bab2a5";
      fetchSubmodules = false;
      sha256 = "sha256-dN1DgdEMxct4LVAKCfbsfXwt3B9A9EqRtziuXznVHXU=";
    };
    date = "2024-10-01";
  };
  klipper-nevermore-controller = {
    pname = "klipper-nevermore-controller";
    version = "4c69464a0a83d4afba1fc8a28567378ab0b75ed2";
    src = fetchFromGitHub {
      owner = "SanaaHamel";
      repo = "nevermore-controller";
      rev = "4c69464a0a83d4afba1fc8a28567378ab0b75ed2";
      fetchSubmodules = false;
      sha256 = "sha256-HLsSKfmaXcAV4iJKN+cNAaunG6DnlZpdpewOSx0Pwzg=";
    };
    date = "2024-10-04";
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
    version = "71eef9ee1f23aa4fd6b68169cfe5dd7908e478b2";
    src = fetchFromGitHub {
      owner = "jordanruthe";
      repo = "KlipperScreen";
      rev = "71eef9ee1f23aa4fd6b68169cfe5dd7908e478b2";
      fetchSubmodules = false;
      sha256 = "sha256-NVgudF6YTj7q6bDfMWYZOOzuch9JfkHP35Dx+cUZq68=";
    };
    date = "2024-10-01";
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
    version = "6a193da7449b205102347a8072767ca84d169526";
    src = fetchFromGitHub {
      owner = "mainsail-crew";
      repo = "mainsail";
      rev = "6a193da7449b205102347a8072767ca84d169526";
      fetchSubmodules = false;
      sha256 = "sha256-pJWfxobpf745LBrBRBhlXsvXX+eu8YTfY3Qxv0WZzu0=";
    };
    date = "2024-09-27";
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
      sha256 = "sha256-6/2+AloDSu2j2ZOv4+aR1qK6JhCfwZxKN+o5VYMvV8E=";
    };
  };
}
