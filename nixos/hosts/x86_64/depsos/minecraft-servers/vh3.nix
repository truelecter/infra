{
  inputs,
  pkgs,
  ...
}: {
  services.yanms.instances.vh3 = {
    enable = false;
    serverPackage = pkgs.mcs-vault-hunters-3;
    bluemap = {
      enable = true;
      package = pkgs.minecraftMods.forge."1.18.1".bluemap;
      port = 8111;
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
      inherit (pkgs.mcs-vault-hunters-3) version;
    in {
      server-port = 25571;
      max-tick-time = 180000;
      allow-flight = true;
      online-mode = true;
      difficulty = 3;
      motd = "\\u00A7d\\u00A7oRealMineCock: Vault Hunters 3\\u00A7r - \\u00A74${version}";
      level-type = "default";
    };
    customization = {
      create = {
        "mods/easier-sleeping.jar".source = pkgs.minecraftMods.forge."1.18.2".easier-sleeping;
        "mods/connectivity.jar".source = pkgs.minecraftMods.forge."1.18.2".connectivity;
        # "mods/functionalstorage.jar".source = pkgs.minecraftMods.forge."1.18.2".functional-storage;
      };

      # remove = [
      #   "mods/functionalstorage-1.18.2-1.1.3.jar"
      # ];
    };
  };
}
