{
  config,
  pkgs,
  lib,
  mods,
  ...
}: {
  services.yanms.instances.cae = {
    enable = false;
    serverPackage = pkgs.mcs-create-arcane-engineering;
    backup.restic = {
      enable = true;
      repository = "rclone:mega:/mc-backups/cae";
      passwordFile = config.sops.secrets.minecraft-restic-pw-file.path;
      environmentFile = config.sops.secrets.minecraft-restic-env-file.path;
      initialize = true;
      exclude = [
        "simplebackups"
        "logs"
        "dumps"
        "bluemap"
      ];
      pruneOpts = [
        "--keep-daily 3"
        "--keep-weekly 1"
      ];
    };
    jvmPackage = pkgs.temurin-bin-21;
    jvmMaxAllocation = "8G";
    jvmInitialAllocation = "8G";

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
    serverProperties = let
      inherit (pkgs.mcs-create-arcane-engineering) version;
    in {
      max-tick-time = 180000;
      allow-flight = true;
      online-mode = true;
      difficulty = 3;
      motd = "\\u00A7d\\u00A7oRealMineCock: Arcane Engineering\\u00A7r - \\u00A74${version}";
    };
    customization = {
      create = {
        "mods/bluemap.jar".source = mods.forge."1.18.1".bluemap;
        "mods/easier-sleeping.jar".source = mods.forge."1.18.2".easier-sleeping;
        "mods/functionalstorage.jar".source = mods.forge."1.18.2".functional-storage;
        "config/bluemap/core.conf".text = ''
          accept-download: true
          data: "bluemap"
          render-thread-count: 1
          scan-for-mod-resources: true
          metrics: true
        '';
      };

      remove = [
        "mods/functionalstorage-1.18.2-1.1.3.jar"
      ];
    };
  };
}
