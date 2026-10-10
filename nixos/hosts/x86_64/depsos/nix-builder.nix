{config, ...}: let
  # Remote builds use this store instead of /nix on the small root disk
  storeRoot = "/cache/nix-builder";
  builder = config.users.users.remote-builder;
in {
  nix.settings.system-features = ["nixos-test" "benchmark" "big-parallel"];

  systemd = {
    tmpfiles.rules = [
      "d ${storeRoot} 0755 ${builder.name} ${builder.group} -"
    ];

    # Nothing roots paths in the builder store, so this drops everything not
    # used by a running build. Clients have copied their results back already.
    services.nix-builder-gc = {
      description = "Garbage collect the remote builder store";
      after = ["cache.mount"];
      requires = ["cache.mount"];
      startAt = "weekly";

      serviceConfig = {
        Type = "oneshot";
        User = builder.name;
        Group = builder.group;
        ExecStart = "${config.nix.package}/bin/nix-store --store ${storeRoot} --gc";
      };
    };

    timers.nix-builder-gc.timerConfig.Persistent = true;
  };
}
