{
  pkgs,
  lib,
  profiles,
  config,
  nixpkgs,
  ...
}: let
  linuxSystem = "aarch64-linux";

  darwin-builder = nixpkgs.lib.nixosSystem {
    system = linuxSystem;
    modules = [
      "${nixpkgs}/nixos/modules/profiles/nix-builder-vm.nix"
      {
        virtualisation = {
          host.pkgs = pkgs;
          cores = 8;

          darwin-builder = {
            workingDirectory = "/var/lib/darwin-builder";
            hostPort = 3022;
            diskSize = 150 * 1024;
            memorySize = 12 * 1024;
          };
        };
      }
      profiles.common.remote-builder
      profiles.nixos.faster-linux
    ];
  };
in {
  nix.distributedBuilds = true;
  nix.buildMachines = [
    {
      hostName = "localhost";
      sshUser = "builder";
      sshKey = config.sops.secrets.remote-builder-pk.path;
      system = linuxSystem;
      maxJobs = 8;
      supportedFeatures = [
        "nixos-test"
        "benchmark"
        "kvm"
        "big-parallel"
      ];
    }
  ];

  launchd.daemons.darwin-builder = {
    environment = {
      inherit (config.environment.variables) NIX_SSL_CERT_FILE;
    };
    script = ''
      export TMPDIR=/run/org.nixos.linux-builder USE_TMPDIR=1
      rm -rf $TMPDIR
      mkdir -p $TMPDIR
      trap "rm -rf $TMPDIR" EXIT
      ${darwin-builder.config.system.build.macos-builder-installer}/bin/create-builder
    '';
    serviceConfig = {
      KeepAlive = true;
      RunAtLoad = true;
      StandardOutPath = "/var/log/darwin-builder.log";
      StandardErrorPath = "/var/log/darwin-builder.log";
      WorkingDirectory = "/var/lib/darwin-builder";
    };
  };

  sops.age.sshKeyPaths = ["/etc/ssh/ssh_host_ed25519_key"];
}
