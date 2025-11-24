{
  config,
  pkgs,
  mods,
  ...
}: {
  services.yanms.instances.sevtech = {
    enable = false;
    serverPackage = pkgs.mcs-sevtech-ages;
    backup.restic = {
      enable = true;
      repository = "rclone:mega:/mc-backups/sevtech";
      passwordFile = config.sops.secrets.minecraft-restic-pw-file.path;
      environmentFile = config.sops.secrets.minecraft-restic-env-file.path;
      initialize = true;
      exclude = [
        "world*.zip"
        "backups/*"
        "logs"
        "tmp"
        "crash-reports"
        "*.logs"
      ];
      pruneOpts = [
        "--keep-daily 3"
        "--keep-weekly 1"
      ];
    };
    jvmPackage = pkgs.temurin-bin-8;
    jvmMaxAllocation = "6G";
    jvmInitialAllocation = "2G";
    jvmOpts = "-XX:+UnlockExperimentalVMOptions -XX:+UnlockDiagnosticVMOptions -XX:+AlwaysActAsServerClassMachine -XX:+ParallelRefProcEnabled -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:+PerfDisableSharedMem -XX:+AggressiveOpts -XX:+UseFastAccessorMethods -XX:MaxInlineLevel=15 -XX:MaxVectorSize=32 -XX:+UseCompressedOops -XX:ThreadPriorityPolicy=1 -XX:+UseNUMA -XX:+UseDynamicNumberOfGCThreads -XX:NmethodSweepActivity=1 -XX:ReservedCodeCacheSize=350M -XX:-DontCompileHugeMethods -XX:MaxNodeLimit=240000 -XX:NodeLimitFudgeFactor=8000 -XX:+UseFPUForSpilling -Dgraal.CompilerConfiguration=community -Dfml.queryResult=confirm";
    serverProperties = {
      max-tick-time = 60000;
      allow-flight = true;
      online-mode = false;
      level-seed = "4685753669571566503";
      motd = "\\u00A7d\\u00A7oRealMineCock: Ages\\u00A7r - \\u00A743.2.3";
    };
    customization = {
      create = {
        "mods/spongeforge.jar".source = mods.forge."1.12.2".spongeforge;
        "mods/changeskinsponge.jar".source = mods.sponge.changeskin;
      };
    };
  };
}
