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
    version = "3fcbc0b448c042933f7d3db7692e00e6a427c5a9";
    src = fetchFromGitHub {
      owner = "DangerKlippers";
      repo = "danger-klipper";
      rev = "3fcbc0b448c042933f7d3db7692e00e6a427c5a9";
      fetchSubmodules = false;
      sha256 = "sha256-6Tm7SI2wcIeWuE0YVc9tjYfJxt2pCi+I0AN4tVMH9uo=";
    };
    date = "2024-12-10";
  };
  experimental-danger-klipper = {
    pname = "experimental-danger-klipper";
    version = "23a5b65a2f2582ff43765e38858aa349bc3a75f6";
    src = fetchFromGitHub {
      owner = "DangerKlippers";
      repo = "danger-klipper";
      rev = "23a5b65a2f2582ff43765e38858aa349bc3a75f6";
      fetchSubmodules = false;
      sha256 = "sha256-9KoKY+PZi903+Se96gExiZWSkpm75/Qy1W7XdMDQ4m4=";
    };
    date = "2024-12-11";
  };
  katapult = {
    pname = "katapult";
    version = "aa37e30b713f4b94cb17af78c5189e99cb65677a";
    src = fetchFromGitHub {
      owner = "Arksine";
      repo = "katapult";
      rev = "aa37e30b713f4b94cb17af78c5189e99cb65677a";
      fetchSubmodules = false;
      sha256 = "sha256-r/QdKyKeG/aECo8bSQaJBc/kZ/Iw0GF0Cg4RCiqMXFk=";
    };
    date = "2024-12-17";
  };
  klipper = {
    pname = "klipper";
    version = "80d185c94c8dbec7f19d791995242af1bb197057";
    src = fetchFromGitHub {
      owner = "Klipper3d";
      repo = "klipper";
      rev = "80d185c94c8dbec7f19d791995242af1bb197057";
      fetchSubmodules = false;
      sha256 = "sha256-X0EtBeRuRjtnwj8ic6PUsrpFwrINj63mImWQyryTa3k=";
    };
    date = "2024-12-19";
  };
  klipper-cartographer = {
    pname = "klipper-cartographer";
    version = "d23a793f608eb3e9bd101dff94844040d39ee661";
    src = fetchFromGitHub {
      owner = "Cartographer3D";
      repo = "cartographer-klipper";
      rev = "d23a793f608eb3e9bd101dff94844040d39ee661";
      fetchSubmodules = false;
      sha256 = "sha256-k1fy7q1CFxy0YR/0ZVQ29boiJ3Xj9cC4Kz3Kl8d/Jlk=";
    };
    date = "2024-12-08";
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
    version = "d9626adc983480ced54e248371a47de8834c1cd5";
    src = fetchFromGitHub {
      owner = "dw-0";
      repo = "kiauh";
      rev = "d9626adc983480ced54e248371a47de8834c1cd5";
      fetchSubmodules = false;
      sha256 = "sha256-uM36kWD+u9w55lDdneHUgewEmeIONFNdVNPYLrfzmn8=";
    };
    date = "2024-11-28";
  };
  klipper-happy-hare = {
    pname = "klipper-happy-hare";
    version = "9d06d262db90227ef4c7a342ee178faa07d760cf";
    src = fetchFromGitHub {
      owner = "moggieuk";
      repo = "Happy-Hare";
      rev = "9d06d262db90227ef4c7a342ee178faa07d760cf";
      fetchSubmodules = false;
      sha256 = "sha256-HrmF+5PMmu9hTbG3ABPjuOLxy52brW04uO8s4Jteg+c=";
    };
    date = "2024-12-14";
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
    version = "fb3c6bc12dca71cbd7a49f9388321769e3f4d490";
    src = fetchFromGitHub {
      owner = "SanaaHamel";
      repo = "nevermore-controller";
      rev = "fb3c6bc12dca71cbd7a49f9388321769e3f4d490";
      fetchSubmodules = false;
      sha256 = "sha256-CpEk9rC48ts5zYjd00D0JSIRcFtAV5gVRibiWNUTbAc=";
    };
    date = "2024-12-09";
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
    version = "14fdbc2f4cdeface5fb55a5c600dd935c67ebf97";
    src = fetchFromGitHub {
      owner = "jordanruthe";
      repo = "KlipperScreen";
      rev = "14fdbc2f4cdeface5fb55a5c600dd935c67ebf97";
      fetchSubmodules = false;
      sha256 = "sha256-f6ZDi9C2glcsDA/1GHFLuVpO3w4l6uY180TgloEA5/o=";
    };
    date = "2024-12-15";
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
    version = "eb39e2be4c10c6342ef345e3b52c13f54131bfe3";
    src = fetchFromGitHub {
      owner = "andrewmcgr";
      repo = "klipper_tmc_autotune";
      rev = "eb39e2be4c10c6342ef345e3b52c13f54131bfe3";
      fetchSubmodules = false;
      sha256 = "sha256-en7i7u6z0uEuxjZ+zK/JAlDBY+7LndTtzn0f7KoST0A=";
    };
    date = "2024-12-17";
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
    version = "4c86d7cd43666a3818c0508e561da641bef4fcbb";
    src = fetchFromGitHub {
      owner = "mainsail-crew";
      repo = "mainsail";
      rev = "4c86d7cd43666a3818c0508e561da641bef4fcbb";
      fetchSubmodules = false;
      sha256 = "sha256-qD8A1ixHpQdV4QE9qbikXlEBNXtnSuQbQFoBPmRzm4I=";
    };
    date = "2024-12-17";
  };
  mobileraker-companion = {
    pname = "mobileraker-companion";
    version = "1d1e2ebe101af12f83ea770301549e15055b36ea";
    src = fetchFromGitHub {
      owner = "Clon1998";
      repo = "mobileraker_companion";
      rev = "1d1e2ebe101af12f83ea770301549e15055b36ea";
      fetchSubmodules = false;
      sha256 = "sha256-1Pj9jHK/aWnDMOYo5QoIJXhuFVwW5EuZZI9V9DhaNRQ=";
    };
    date = "2024-12-04";
  };
  moonraker = {
    pname = "moonraker";
    version = "ccfe32f2368a5ff6c2497478319909daeeeb8edf";
    src = fetchFromGitHub {
      owner = "Arksine";
      repo = "moonraker";
      rev = "ccfe32f2368a5ff6c2497478319909daeeeb8edf";
      fetchSubmodules = false;
      sha256 = "sha256-aCYE3EmflMRIHnGnkZ/0+zScVA5liHSbavScQ7XRf/4=";
    };
    date = "2024-11-17";
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
    version = "v0.21.0";
    src = fetchurl {
      url = "https://github.com/Donkie/Spoolman/releases/download/v0.21.0/spoolman.zip";
      sha256 = "sha256-rGK5tmijg0t7Fmo6l5GcAK1ZGImXfb1x68dWOTTSeVU=";
    };
  };
}
