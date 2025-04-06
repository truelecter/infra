{config, ...}: let
  builder-username = "remote-builder";

  mkBuildMachine = {
    hostName,
    maxJobs,
    speedFactor ? maxJobs * 10,
    systems,
  }: {
    inherit hostName maxJobs speedFactor systems;

    supportedFeatures = [
      "nixos-test"
      "benchmark"
      "kvm"
      "big-parallel"
    ];

    sshUser = builder-username;
    sshKey = config.sops.secrets.remote-builder-pk.path;
  };
in {
  environment.etc."ssh/ssh_config.d/100-linux-builder.conf".text = ''
    Host mm4-builder
      User ${builder-username}
      Hostname tl-mm4
      HostKeyAlias mm4-builder
      Port 3022
      IdentityFile ${config.sops.secrets.remote-builder-pk.path}
  '';

  nix = {
    distributedBuilds = true;

    buildMachines = builtins.map mkBuildMachine [
      {
        maxJobs = 4;
        hostName = "oracle";
        systems = [
          "aarch64-linux"
        ];
      }
      {
        maxJobs = 10;
        hostName = "mm4-builder";
        systems = [
          "aarch64-linux"
        ];
      }
      {
        maxJobs = 10;
        hostName = "tl-mm4";
        systems = [
          "aarch64-darwin"
        ];
      }
      {
        maxJobs = 4;
        hostName = "depsos";
        systems = [
          "x86_64-linux"
          "i686-linux"
        ];
      }
    ];
  };

  sops.secrets = {
    remote-builder-pk = {
      sopsFile = ../../secrets/ssh/remote-builder;
      format = "binary";
      group = "wheel";
    };
  };
}
