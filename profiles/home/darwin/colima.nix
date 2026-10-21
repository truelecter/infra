# Docker on Colima with the krunkit VM type. Unlike vz (Apple's Virtualization framework), krunkit
# returns memory the guest frees to macOS, so the VM can be sized generously. Start it by hand
# with `colima start`; it stops itself after `idleMinutes` without running containers.
{
  config,
  lib,
  pkgs,
  ...
}: let
  colimaHome = "${config.xdg.configHome}/colima";
  idleMinutes = 30;
  checkMinutes = 5;

  # Wraps colima for krunkit instances (Colima 0.10.3, Lima 2.2.0):
  # - `stop` and `restart` power the guest off from inside first. Lima stops krunkit with SIGTERM,
  #   which drops the guest like a power cut.
  # - The first `start` restarts once. Lima's krunkit driver mounts the data disk only on the first
  #   boot (it tells the guest `vdb`, krunkit attaches the disk as `vdc`), so after that Docker's
  #   data lives on the root disk. Restarting at once keeps nothing on the data disk.
  colima = pkgs.writeShellApplication {
    name = "colima";
    text = ''
      real=${lib.getExe pkgs.colima}
      export COLIMA_HOME="''${COLIMA_HOME:-${colimaHome}}"

      cmd=''${1:-}
      profile=''${COLIMA_PROFILE:-default}
      if [ $# -ge 2 ] && [[ $2 != -* ]]; then
        profile=$2
      fi
      force=false
      prev=""
      for arg in "$@"; do
        case $prev in -p | --profile) profile=$arg ;; esac
        case $arg in
          --profile=*) profile=''${arg#--profile=} ;;
          -f | --force) force=true ;;
        esac
        prev=$arg
      done

      instance=colima
      [ "$profile" = default ] || instance="colima-$profile"
      lima_dir="$COLIMA_HOME/_lima/$instance"

      # Home Manager links colima.yaml of the profiles it manages to the store: don't write it back.
      if [ -L "$COLIMA_HOME/$profile/colima.yaml" ]; then
        export COLIMA_SAVE_CONFIG=false
      fi

      is_krunkit() { grep -qs '^vmType: krunkit' "$lima_dir/lima.yaml"; }
      vm_running() { pgrep -f "logFilePath=$lima_dir/serial.log" >/dev/null; }

      poweroff_guest() {
        # lima-guestagent holds the shutdown for about 90 s: kill it first.
        "$real" ssh -p "$profile" -- sudo sh -c \
          'systemctl kill -s KILL lima-guestagent; systemctl poweroff' >/dev/null 2>&1 || true
        for _ in $(seq 60); do
          vm_running || return 0
          sleep 1
        done
        echo "colima: the guest did not power off within 60 s, stopping it anyway" >&2
      }

      case $cmd in
        stop | restart)
          if ! $force && is_krunkit && vm_running; then
            poweroff_guest
          fi
          exec "$real" "$@"
          ;;
        start)
          if [ -e "$lima_dir" ]; then
            exec "$real" "$@"
          fi
          "$real" "$@"
          if is_krunkit; then
            echo "colima: first krunkit boot, restarting once to keep Docker's data on the root disk" >&2
            poweroff_guest
            "$real" stop -p "$profile"
            exec "$real" "$@"
          fi
          ;;
        *)
          exec "$real" "$@"
          ;;
      esac
    '';
  };

  idleStop = pkgs.writeShellApplication {
    name = "colima-idle-stop";
    runtimeInputs = [colima pkgs.docker];
    text = ''
      lima_dir="${colimaHome}/_lima/colima"
      state="${config.xdg.stateHome}/colima/idle-checks"

      if ! pgrep -f "logFilePath=$lima_dir/serial.log" >/dev/null; then
        rm -f "$state"
        exit 0
      fi
      if ! running=$(docker --host "unix://${colimaHome}/default/docker.sock" ps -q); then
        exit 0
      fi
      if [ -n "$running" ]; then
        rm -f "$state"
        exit 0
      fi

      checks=$(($(cat "$state" 2>/dev/null || echo 0) + 1))
      if [ "$checks" -lt ${toString (idleMinutes / checkMinutes)} ]; then
        mkdir -p "$(dirname "$state")"
        echo "$checks" >"$state"
        exit 0
      fi
      rm -f "$state"
      echo "$(date): no running containers for ${toString idleMinutes} min, stopping colima"
      colima stop
    '';
  };
in {
  home.packages = [pkgs.docker];

  services.colima = {
    enable = true;
    package = colima;
    colimaHomeDir = colimaHome;

    # Not a launchd service, not the active Docker context: `colima start` switches the context.
    profiles.default.settings = {
      cpu = 6;
      memory = 8;
      # Lima mounts the data disk on the first boot only (see the wrapper): keep it small, Docker
      # uses the root disk.
      disk = 5;
      rootDisk = 100;
      arch = "host";
      runtime = "docker";
      modelRunner = "docker";
      hostname = null;
      kubernetes = {
        enabled = false;
        version = "v1.35.0+k3s1";
        k3sArgs = ["--disable=traefik"];
        port = 0;
      };
      autoActivate = true;
      network = {
        address = false;
        mode = "shared";
        interface = "en0";
        preferredRoute = false;
        dns = [];
        dnsHosts."host.docker.internal" = "host.lima.internal";
        hostAddresses = false;
        gatewayAddress = "192.168.5.2";
      };
      forwardAgent = false;
      docker = {};
      vmType = "krunkit";
      portForwarder = "ssh";
      # No Rosetta on krunkit: amd64 images run through qemu user emulation.
      rosetta = false;
      binfmt = true;
      nestedVirtualization = false;
      # Needs the patch in parts/overrides: Colima 0.10.3 gives krunkit 9p, which Lima rejects.
      mountType = "virtiofs";
      mountInotify = false;
      cpuType = "host";
      provision = [];
      sshConfig = true;
      sshPort = 0;
      mounts = [];
      diskImage = "";
      forceDiskImage = false;
      env = {};
    };
  };

  launchd.agents.colima-idle-stop = {
    enable = true;
    config = {
      ProgramArguments = [(lib.getExe idleStop)];
      StartInterval = checkMinutes * 60;
      StandardOutPath = "${config.home.homeDirectory}/Library/Logs/colima-idle-stop.log";
      StandardErrorPath = "${config.home.homeDirectory}/Library/Logs/colima-idle-stop.log";
    };
  };
}
