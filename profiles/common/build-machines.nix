{
  config,
  inputs,
  ...
}: let
  builder-username = "remote-builder";

  mkBuildMachine = {
    hostName,
    maxJobs,
    speedFactor ? maxJobs * 10,
    systems,
    supportedFeatures ? [
      "nixos-test"
      "benchmark"
      "kvm"
      "big-parallel"
    ],
  }: {
    inherit hostName maxJobs speedFactor systems supportedFeatures;

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

    buildMachines = map mkBuildMachine [
      # {
      #   maxJobs = 4;
      #   hostName = "oracle";
      #   systems = [
      #     "aarch64-linux"
      #   ];
      # }
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
        # Builds go to a separate store on the big /cache disk
        hostName = "depsos?remote-store=/cache/nix-builder";
        systems = [
          "x86_64-linux"
          "i686-linux"
        ];

        supportedFeatures = [
          "nixos-test"
          "benchmark"
          "big-parallel"
        ];
      }
    ];
  };

  sops.secrets = {
    remote-builder-pk = {
      sopsFile = "${inputs.self}/secrets/ssh/remote-builder";
      format = "binary";
      group = "wheel";
    };
  };
}
