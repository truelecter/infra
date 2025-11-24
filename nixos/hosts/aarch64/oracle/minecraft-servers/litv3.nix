{
  config,
  pkgs,
  lib,
  mods,
  ...
}: {
  services.yanms.instances.litv3 = {
    enable = false;
    serverPackage = pkgs.mcs-life-in-the-village-3;
    backup.restic = {
      enable = true;
      repository = "rclone:mega:/mc-backups/litv3";
      passwordFile = config.sops.secrets.minecraft-restic-pw-file.path;
      environmentFile = config.sops.secrets.minecraft-restic-env-file.path;
      initialize = true;
      exclude = [
        "dumps"
        "logs"
        "bluemap"
      ];
      pruneOpts = [
        "--keep-daily 3"
        "--keep-weekly 1"
      ];
    };
    jvmPackage = pkgs.temurin-bin-21;
    jvmMaxAllocation = "12G";
    jvmInitialAllocation = "12G";
    jvmOpts = lib.concatStringsSep " " [
      "-XX:+UnlockExperimentalVMOptions"
      "-XX:+UnlockDiagnosticVMOptions"
      "-XX:+AlwaysActAsServerClassMachine"
      "-XX:+AlwaysPreTouch"
      "-XX:+DisableExplicitGC"
      "-XX:+UseNUMA"
      "-XX:NmethodSweepActivity=1"
      "-XX:ReservedCodeCacheSize=400M"
      "-XX:NonNMethodCodeHeapSize=12M"
      "-XX:ProfiledCodeHeapSize=194M"
      "-XX:NonProfiledCodeHeapSize=194M"
      "-XX:-DontCompileHugeMethods"
      "-XX:MaxNodeLimit=240000"
      "-XX:NodeLimitFudgeFactor=8000"
      "-XX:+UseVectorCmov"
      "-XX:+PerfDisableSharedMem"
      "-XX:+UseFastUnorderedTimeStamps"
      "-XX:+UseCriticalJavaThreadPriority"
      "-XX:ThreadPriorityPolicy=1"
      "-XX:AllocatePrefetchStyle=3"
      # GC
      "-XX:+UseZGC"
      "-XX:+ZGenerational"
      "-XX:+AlwaysPreTouch"
      "-XX:+PerfDisableSharedMem"
      "-XX:-ZUncommit"
      "-XX:+ParallelRefProcEnabled"
      "-XX:-OmitStackTraceInFastThrow"
      "-XX:+UseStringDeduplication"
      "-XX:+DisableExplicitGC"
      "-XX:ConcGCThreads=4"
      "-XX:+UseTransparentHugePages"
    ];
    customization = {
      create = {
        "mods/carryon-forge-1.19.2-2.1.2.23.jar".source = mods.forge."1.19.2".carryon;
        "mods/tombstone-1.19.2-8.2.16.jar".source = mods.forge."1.19.2".corail-tombstone;
        # "mods/passablefolliage.jar".source = pkgs.minecraft-mods.forge.passablefolliage-19-2;
        "mods/ftb-chunks.jar".source = mods.forge."1.19.2".ftb-chunks;
        "mods/ftb-xmod-compat.jar".source = mods.forge."1.19.2".ftb-xmod-compat;
        "mods/kiwi.jar".source = mods.forge."1.19.2".kiwi;
        "mods/bluemap.jar".source = mods.forge."1.19.1".bluemap;
        "config/bluemap/core.conf".text = ''
          accept-download: true
          data: "bluemap"
          render-thread-count: 1
          scan-for-mod-resources: true
          metrics: true
        '';
      };
      remove = [
        "mods/tombstone-1.19.2-8.2.15.jar"
      ];
    };
    serverProperties = let
      inherit (pkgs.mcs-life-in-the-village-3) version;
    in {
      max-tick-time = 600000;
      allow-flight = true;
      online-mode = true;
      difficulty = 3;
      motd = "\\u00A7d\\u00A7oRealMineCock: Life in the village 3\\u00A7r - \\u00A74${version}";
    };
  };
}
