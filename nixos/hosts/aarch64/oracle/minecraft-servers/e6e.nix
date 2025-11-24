{
  config,
  pkgs,
  lib,
  ...
}: {
  services.yanms.instances.e6e = {
    enable = false;
    serverPackage = pkgs.mcs-enigmatica-6-expert;
    backup.restic = {
      enable = true;
      repository = "rclone:mega:/mc-backups/e6e";
      passwordFile = config.sops.secrets.minecraft-restic-pw-file.path;
      environmentFile = config.sops.secrets.minecraft-restic-env-file.path;
      initialize = true;
      exclude = [
        "dumps"
        "logs"
      ];
      pruneOpts = [
        "--keep-daily 3"
        "--keep-weekly 1"
      ];
    };
    jvmPackage = pkgs.temurin-bin-8;
    jvmMaxAllocation = "6G";
    jvmInitialAllocation = "6G";
    jvmOpts = lib.concatStringsSep " " [
      "-XX:+UnlockExperimentalVMOptions"
      "-XX:+UnlockDiagnosticVMOptions"
      "-XX:+AlwaysActAsServerClassMachine"
      "-XX:+ParallelRefProcEnabled"
      "-XX:+DisableExplicitGC"
      "-XX:+AlwaysPreTouch"
      "-XX:+PerfDisableSharedMem"
      "-XX:+AggressiveOpts"
      "-XX:+UseFastAccessorMethods"
      "-XX:MaxInlineLevel=15"
      "-XX:MaxVectorSize=32"
      "-XX:+UseCompressedOops"
      "-XX:ThreadPriorityPolicy=1"
      "-XX:+UseNUMA"
      "-XX:+UseDynamicNumberOfGCThreads"
      "-XX:NmethodSweepActivity=1"
      "-XX:ReservedCodeCacheSize=350M"
      "-XX:-DontCompileHugeMethods"
      "-XX:MaxNodeLimit=240000"
      "-XX:NodeLimitFudgeFactor=8000"
      "-XX:+UseFPUForSpilling"
      "-Dgraal.CompilerConfiguration=community"
    ];
    serverProperties = {
      motd = "\\u00A7d\\u00A7oRealMineCocks: Enigmatica 6 Expert\\u00A7r - \\u00A741.8.0";
    };
  };
}
