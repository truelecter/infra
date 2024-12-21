# This file was generated by nvfetcher, please do not modify it manually.
{ fetchgit, fetchurl, fetchFromGitHub, dockerTools }:
{
  libcamera = {
    pname = "libcamera";
    version = "1230f78d2f6d38d812568fd27f7b985b9ff19e39";
    src = fetchFromGitHub {
      owner = "raspberrypi";
      repo = "libcamera";
      rev = "1230f78d2f6d38d812568fd27f7b985b9ff19e39";
      fetchSubmodules = false;
      sha256 = "sha256-pG8QdMY9UWH+UodXi1j/hVuVFRe58vvOsf7tOrrb774=";
    };
    date = "2024-11-19";
  };
  libcamera-apps = {
    pname = "libcamera-apps";
    version = "b78871ec21b466d8cbf04430af88b660aff5a487";
    src = fetchFromGitHub {
      owner = "raspberrypi";
      repo = "libcamera-apps";
      rev = "b78871ec21b466d8cbf04430af88b660aff5a487";
      fetchSubmodules = false;
      sha256 = "sha256-pbSCE+xe5isdsJ0RVsUZAmrhK7IBBxhKC4QzJFCkeqY=";
    };
    date = "2024-12-05";
  };
  mediamtx = {
    pname = "mediamtx";
    version = "d23fb08e2d6492cd4865f3055eeee878fdfdd4d7";
    src = fetchFromGitHub {
      owner = "bluenviron";
      repo = "mediamtx";
      rev = "d23fb08e2d6492cd4865f3055eeee878fdfdd4d7";
      fetchSubmodules = false;
      sha256 = "sha256-RdFMv69O9VFWLomCeeUw9REi32Kbme6ApLVsWhpWngM=";
    };
    date = "2024-12-18";
  };
}
