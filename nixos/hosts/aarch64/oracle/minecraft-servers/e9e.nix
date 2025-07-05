{
  config,
  pkgs,
  lib,
  mods,
  ...
}: {
  services.minecraft-servers.instances.e9e = {
    enable = true;
    serverPackage = pkgs.mcs-enigmatica-9-expert;
    backup.restic = {
      enable = true;
      repository = "rclone:mega:/mc-backups/e9e";
      passwordFile = config.sops.secrets.minecraft-restic-pw-file.path;
      environmentFile = config.sops.secrets.minecraft-restic-env-file.path;
      initialize = true;
      exclude = [
        "dumps"
        "logs"
        "backups"
        "dynmap"
      ];
      pruneOpts = [
        "--keep-daily 3"
        "--keep-weekly 1"
      ];
    };
    jvmPackage = pkgs.temurin-bin-17;
    jvmMaxAllocation = "8G";
    jvmInitialAllocation = "4G";
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
      "-XX:+UseZGC"
      "-XX:AllocatePrefetchStyle=1"
      "-XX:-ZProactive"
      "-XX:ConcGCThreads=2"
    ];
    customization = {
      create = {
        "mods/bluemap.jar".source = mods.forge."1.19.1".bluemap;
        "config/bluemap/core.conf".text = ''
          accept-download: true
          data: "bluemap"
          render-thread-count: 1
          scan-for-mod-resources: true
          metrics: true
        '';
      };
    };
    serverProperties = {
      max-tick-time = 600000;
      allow-flight = true;
      online-mode = true;
      difficulty = 3;
      motd = "\\u00A7d\\u00A7oRealMineCock: Enigmatica 9 Expert\\u00A7r - \\u00A741.18.0";
    };
  };
}
