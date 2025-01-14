# This file was generated by nvfetcher, please do not modify it manually.
{ fetchgit, fetchurl, fetchFromGitHub, dockerTools }:
{
  s5cmd = {
    pname = "s5cmd";
    version = "991c9fbc16709341b4bac04513232a1445941f63";
    src = fetchFromGitHub {
      owner = "peak";
      repo = "s5cmd";
      rev = "991c9fbc16709341b4bac04513232a1445941f63";
      fetchSubmodules = false;
      sha256 = "sha256-+wSVJkXmu+1BzvO1o31jhKZLXeG7y+YkABIZZ1TlK/g=";
    };
    date = "2024-12-16";
  };
  tfenv = {
    pname = "tfenv";
    version = "39d8c27ad9862ffdec57989b66fd2720cb72e76c";
    src = fetchFromGitHub {
      owner = "tfutils";
      repo = "tfenv";
      rev = "39d8c27ad9862ffdec57989b66fd2720cb72e76c";
      fetchSubmodules = false;
      sha256 = "sha256-h5ZHT4u7oAdwuWpUrL35G8bIAMasx6E81h15lTJSHhQ=";
    };
    date = "2023-12-19";
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
