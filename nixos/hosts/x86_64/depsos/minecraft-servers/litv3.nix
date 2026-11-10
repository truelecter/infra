{
  inputs,
  pkgs,
  ...
}: {
  services.yanms.instances.litv3 = {
    enable = false;
    serverPackage = pkgs.mcs-life-in-the-village-3;
    bluemap = {
      enable = true;
      package = pkgs.minecraftMods.forge."1.19.1".bluemap;
      port = 8109;
    };
    backup.restic = {
      enable = true;
      exclude = [
        "dumps"
        "logs"
        "bluemap"
      ];
    };
    jvmPackage = pkgs.temurin-bin-21;
    jvmMaxAllocation = "12G";
    jvmInitialAllocation = "12G";
    jvmOpts = inputs.yanms.lib.jvmFlags.zgcGenerational;
    customization = {
      create = {
        "mods/carryon-forge-1.19.2-2.1.2.23.jar".source = pkgs.minecraftMods.forge."1.19.2".carryon;
        "mods/tombstone-1.19.2-8.2.16.jar".source = pkgs.minecraftMods.forge."1.19.2".corail-tombstone;
        # "mods/passablefolliage.jar".source = pkgs.minecraft-pkgs.minecraftMods.forge.passablefolliage-19-2;
        "mods/ftb-chunks.jar".source = pkgs.minecraftMods.forge."1.19.2".ftb-chunks;
        "mods/ftb-xmod-compat.jar".source = pkgs.minecraftMods.forge."1.19.2".ftb-xmod-compat;
        "mods/kiwi.jar".source = pkgs.minecraftMods.forge."1.19.2".kiwi;
      };
      remove = [
        "mods/tombstone-1.19.2-8.2.15.jar"
      ];
    };
    serverProperties = let
      inherit (pkgs.mcs-life-in-the-village-3) version;
    in {
      server-port = 25569;
      max-tick-time = 600000;
      allow-flight = true;
      online-mode = true;
      difficulty = 3;
      motd = "\\u00A7d\\u00A7oRealMineCock: Life in the village 3\\u00A7r - \\u00A74${version}";
    };
  };
}
