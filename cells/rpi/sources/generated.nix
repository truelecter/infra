# This file was generated by nvfetcher, please do not modify it manually.
{ fetchgit, fetchurl, fetchFromGitHub, dockerTools }:
{
  libcamera = {
    pname = "libcamera";
    version = "29156679717bec7cc4784aeba3548807f2c27fca";
    src = fetchFromGitHub {
      owner = "raspberrypi";
      repo = "libcamera";
      rev = "29156679717bec7cc4784aeba3548807f2c27fca";
      fetchSubmodules = false;
      sha256 = "sha256-89uo3ajxozSpM4AGVIVb5GJ70giAQeyw0duIj5PRBgo=";
    };
    date = "2025-02-13";
  };
  libcamera-apps = {
    pname = "libcamera-apps";
    version = "9b351293f76ea78c2345900a8df3778172e02f9b";
    src = fetchFromGitHub {
      owner = "raspberrypi";
      repo = "libcamera-apps";
      rev = "9b351293f76ea78c2345900a8df3778172e02f9b";
      fetchSubmodules = false;
      sha256 = "sha256-bZD/3hHMA5tccDrvbZWn9xmgaxrkW2/WsMGNjY233vs=";
    };
    date = "2025-02-14";
  };
  mediamtx = {
    pname = "mediamtx";
    version = "0711bf43a4def703ea0fe7450ba3db7a12c9eceb";
    src = fetchFromGitHub {
      owner = "bluenviron";
      repo = "mediamtx";
      rev = "0711bf43a4def703ea0fe7450ba3db7a12c9eceb";
      fetchSubmodules = false;
      sha256 = "sha256-e27iLxmB/p9pz/HJV3GzXIj0iR56/ptiOI30lhNCaiA=";
    };
    date = "2025-02-14";
  };
}
