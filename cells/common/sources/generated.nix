# This file was generated by nvfetcher, please do not modify it manually.
{ fetchgit, fetchurl, fetchFromGitHub, dockerTools }:
{
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
}