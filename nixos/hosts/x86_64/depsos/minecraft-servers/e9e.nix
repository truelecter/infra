{
  inputs,
  pkgs,
  ...
}: {
  services.yanms.instances.e9e = {
    enable = false;
    serverPackage = pkgs.mcs-enigmatica-9-expert;
    bluemap = {
      enable = true;
      package = pkgs.minecraftMods.forge."1.19.1".bluemap;
      port = 8112;
    };
    backup.restic = {
      enable = true;
      exclude = [
        "dumps"
        "logs"
        "backups"
        "dynmap"
      ];
    };
    jvmPackage = pkgs.temurin-bin-17;
    # depsos has 7 GB. Enigmatica's minimum is 6 GB, for the client with rendering;
    # https://wiki.enigmatica.net/main/help-desk/guides/allocating-memory
    jvmMaxAllocation = "4G";
    jvmInitialAllocation = "2G";
    memoryMax = "5G";
    jvmOpts = inputs.yanms.lib.jvmFlags.zgc;
    serverProperties = {
      server-port = 25568;
      max-tick-time = 600000;
      allow-flight = true;
      online-mode = true;
      difficulty = 3;
      motd = "\\u00A7d\\u00A7oRealMineCock: Enigmatica 9 Expert\\u00A7r - \\u00A741.25.0";
    };
  };
}
