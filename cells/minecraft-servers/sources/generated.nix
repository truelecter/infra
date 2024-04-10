# This file was generated by nvfetcher, please do not modify it manually.
{ fetchgit, fetchurl, fetchFromGitHub, dockerTools }:
{
  forge-server-14-23-5-2860 = {
    pname = "forge-server-14-23-5-2860";
    version = "14.23.5.2860";
    src = fetchurl {
      url = "https://maven.minecraftforge.net/net/minecraftforge/forge/1.12.2-14.23.5.2860/forge-1.12.2-14.23.5.2860-installer.jar";
      sha256 = "sha256-6nwzupXjmTqY0OnjgWjAdZ7DI6GGdacdk44fP3Dm6Oc=";
    };
  };
  forge-server-40-2-9 = {
    pname = "forge-server-40-2-9";
    version = "40.2.9";
    src = fetchurl {
      url = "https://maven.minecraftforge.net/net/minecraftforge/forge/1.18.2-40.2.9/forge-1.18.2-40.2.9-installer.jar";
      sha256 = "sha256-UUPQjoHir9F18SF+JkUJKoMMfv4s7gJcLsBaCZTEXl4=";
    };
  };
  knock = {
    pname = "knock";
    version = "a690305c6d960374fd9b1024db85a8cdfa0bf1a4";
    src = fetchFromGitHub {
      owner = "Metalcape";
      repo = "knock";
      rev = "a690305c6d960374fd9b1024db85a8cdfa0bf1a4";
      fetchSubmodules = false;
      sha256 = "sha256-RHSNvaQdIUjzN7MCDyLOosHo22CSkFlzCERCg0TFxhI=";
    };
    date = "2023-03-10";
  };
  mcs-dawncraft = {
    pname = "mcs-dawncraft";
    version = "1.28_f2";
    src = fetchurl {
      url = "https://mediafilez.forgecdn.net/files/4709/791/DawnCraft+1.28_f2+Serverpack.zip";
      sha256 = "sha256-kq1MjOpQXLRsCGjIdSh9L5ZgSQpUbnRZlBLNcti9khs=";
    };
  };
  mcs-enigmatica-6-expert = {
    pname = "mcs-enigmatica-6-expert";
    version = "1.8.0";
    src = fetchurl {
      url = "https://mediafilez.forgecdn.net/files/4437/745/Enigmatica6ExpertServer-1.8.0.zip";
      sha256 = "sha256-rmMzXGBqKREWKqUqJ8nNfZOyngamfukA15AmUTjKKIY=";
    };
  };
  mcs-enigmatica-9-expert = {
    pname = "mcs-enigmatica-9-expert";
    version = "1.18.0";
    src = fetchurl {
      url = "https://mediafilez.forgecdn.net/files/5015/234/Enigmatica9ExpertServer-1.18.0.zip";
      sha256 = "sha256-yNZb2vRtG7PYJM1HfAfgT6jDXpCe9fJni1axg0Q76Lg=";
    };
  };
  mcs-life-in-the-village-3 = {
    pname = "mcs-life-in-the-village-3";
    version = "2.7b";
    src = fetchurl {
      url = "https://mediafilez.forgecdn.net/files/5177/639/LITV3-1.19.2-Serverpack-2.7b.zip";
      sha256 = "sha256-rCQjZY3iWd9iLP02z4QcAKDOJiFTVXbtSTYtCQn+0vM=";
    };
  };
  mcs-sevtech-ages = {
    pname = "mcs-sevtech-ages";
    version = "3.2.3";
    src = fetchurl {
      url = "https://mediafilez.forgecdn.net/files/3570/46/SevTech_Ages_Server_3.2.3.zip";
      sha256 = "sha256-StrvXb/5/6sf1vdEB3JUXAsuaRsWPXRcnvZkwMATHpQ=";
    };
  };
  mod-changeskincore = {
    pname = "mod-changeskincore";
    version = "3.2";
    src = fetchurl {
      url = "https://ci.codemc.io/job/Games647/job/ChangeSkin/474/artifact/core/target/ChangeSkinCore.jar";
      sha256 = "sha256-IR8thoPfzEkj+/BepSqZ8/Qs6s91C+r3HnuM71VUGkM=";
    };
  };
  mod-forge-19-2-dynmap = {
    pname = "mod-forge-19-2-dynmap";
    version = "3.7-beta-4";
    src = fetchurl {
      url = "https://mediafilez.forgecdn.net/files/4979/21/Dynmap-3.7-beta-4-forge-1.19.2.jar";
      sha256 = "sha256-f7O24vgIaySn9PrBtedr6mKCUX1i4J7FumZZeTHA5PQ=";
    };
  };
  mod-forge-19-bluemap = {
    pname = "mod-forge-19-bluemap";
    version = "3.13";
    src = fetchurl {
      url = "https://github.com/BlueMap-Minecraft/BlueMap/releases/download/v3.13/BlueMap-3.13-forge-1.19.1.jar";
      sha256 = "sha256-iwH5m15LwobZviIlbwNdBBD1mrbgZ0TuYyAzXl3lWCY=";
    };
  };
  mod-forge-19-dynmap-blockscan = {
    pname = "mod-forge-19-dynmap-blockscan";
    version = "3.7-SNAPSHOT";
    src = fetchurl {
      url = "https://dynmap.us/builds/DynmapBlockScan/DynmapBlockScan-3.7-SNAPSHOT-forge-1.19.jar";
      sha256 = "sha256-QNkIcV7DztQcvYvAabUh0X+N3vEJiRvMqJomvRt03LU=";
    };
  };
  mod-forge-192-corail-tombstone = {
    pname = "mod-forge-192-corail-tombstone";
    version = "8.2.16";
    src = fetchurl {
      url = "https://mediafilez.forgecdn.net/files/5202/57/tombstone-1.19.2-8.2.16.jar";
      sha256 = "sha256-BvdVa4KAqMDI8SqnnZj14cDF2b7o/rhM6wc+GGuFBI8=";
    };
  };
  mod-forge-spongeforge = {
    pname = "mod-forge-spongeforge";
    version = "1.12.2-2838-7.4.7";
    src = fetchurl {
      url = "https://repo.spongepowered.org/repository/maven-releases/org/spongepowered/spongeforge/1.12.2-2838-7.4.7/spongeforge-1.12.2-2838-7.4.7.jar";
      sha256 = "sha256-tK9S6r/ZYDw1eLFqSoMWUz38nzRHQZrs+CvT5/l+Jsk=";
    };
  };
  mod-sponge-changeskin = {
    pname = "mod-sponge-changeskin";
    version = "3.2";
    src = fetchurl {
      url = "https://ci.codemc.io/job/Games647/job/ChangeSkin/474/artifact/sponge/target/ChangeSkinSponge.jar";
      sha256 = "sha256-rw0zwjPfEQv9Q9ThxQZalaCvoXgPFygAAtfHfoKqb7Y=";
    };
  };
  mp-server-pause-forge-1_16_5 = {
    pname = "mp-server-pause-forge-1_16_5";
    version = "1.1.0";
    src = fetchurl {
      url = "https://www.curseforge.com/api/v1/mods/556491/files/3803691/download";
      sha256 = "sha256-XhfCex4pwFM3TKQtF+1YdYeIPhR+5pITgKoR+BZN6EA=";
    };
  };
  server-starter = {
    pname = "server-starter";
    version = "2.4.0";
    src = fetchurl {
      url = "https://github.com/EnigmaticaModpacks/ServerStarter/releases/download/v2.4.0/serverstarter-2.4.0.jar";
      sha256 = "sha256-cL7Cdx/QACCah3i4RX8jG/jmJEuz2Numu3OcNmLgmbQ=";
    };
  };
}
