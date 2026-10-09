{
  pkgs,
  profiles,
  config,
  nixpkgs,
  ...
}: let
  linuxSystem = "aarch64-linux";

  darwin-builder = nixpkgs.lib.nixosSystem {
    system = linuxSystem;
    modules = [
      # Migrate to vz-vm when released
      # "${nixpkgs}/nixos/modules/profiles/nix-builder-vz-vm.nix"
      "${nixpkgs}/nixos/modules/profiles/nix-builder-vm.nix"
      {
        virtualisation = {
          # Migrate to vz-vm when released
          # vz.rosetta = false;
          host.pkgs = pkgs;
          cores = 8;

          darwin-builder = {
            workingDirectory = "/var/lib/darwin-builder";
            hostPort = 3022;
            diskSize = 100 * 1024;
            memorySize = 12 * 1024;
          };
        };

        # QEMU user networking NATs every forwarded connection to one source,
        # so ssh-keyscan probes trip per-source penalties and lock everyone
        # out ("Not allowed at this time"). VM is reachable only via VPN.
        services.openssh.settings.PerSourcePenalties = "no";

        # launchd restarts kill the VM uncleanly; without fsync a freshly
        # built path can be registered valid while its files are still empty.
        nix.settings.fsync-store-paths = true;
      }
      profiles.common.remote-builder
      profiles.nixos.faster-linux
      profiles.common.github-actions-builder
    ];
  };
in {
  # The VM is reached as `mm4-builder` via profiles.common.build-machines.

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
