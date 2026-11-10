{
  inputs,
  pkgs,
  ...
}: {
  services.yanms.instances.cae = {
    enable = false;
    serverPackage = pkgs.mcs-create-arcane-engineering;
    bluemap = {
      enable = true;
      package = pkgs.minecraftMods.forge."1.18.1".bluemap;
      port = 8110;
    };
    backup.restic = {
      enable = true;
      exclude = [
        "simplebackups"
        "logs"
        "dumps"
        "bluemap"
      ];
    };
    jvmPackage = pkgs.temurin-bin-21;
    jvmMaxAllocation = "8G";
    jvmInitialAllocation = "8G";

    jvmOpts = inputs.yanms.lib.jvmFlags.zgcGenerational;
    serverProperties = let
      inherit (pkgs.mcs-create-arcane-engineering) version;
    in {
      server-port = 25570;
      max-tick-time = 180000;
      allow-flight = true;
      online-mode = true;
      difficulty = 3;
      motd = "\\u00A7d\\u00A7oRealMineCock: Arcane Engineering\\u00A7r - \\u00A74${version}";
    };
    customization = {
      create = {
        "mods/easier-sleeping.jar".source = pkgs.minecraftMods.forge."1.18.2".easier-sleeping;
        "mods/functionalstorage.jar".source = pkgs.minecraftMods.forge."1.18.2".functional-storage;
      };

      remove = [
        "mods/functionalstorage-1.18.2-1.1.3.jar"
      ];
    };
  };
}
