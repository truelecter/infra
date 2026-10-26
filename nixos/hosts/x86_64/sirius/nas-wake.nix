# Wake-on-LAN front for the NAS, which sleeps while the grid is down (see
# nas/autosuspend.nix). *.xata.house points at this host: every connection
# to 80/443 wakes the NAS if needed, waits for it to answer, then is passed
# through as plain TCP, so TLS still ends on the NAS.
{
  lib,
  pkgs,
  ...
}: let
  nasAddress = "10.3.0.132";
  nasMac = "f4:b5:20:45:4d:2e";
  listenAddress = "10.3.0.129";
  bridge = "br-switch";
  ports = [80 443];

  wake = pkgs.writeShellApplication {
    name = "nas-wake";
    text = ''
      ${pkgs.busybox}/bin/ether-wake -i ${bridge} ${nasMac}
    '';
  };

  # Exit 0 once NAS answers on the port, sending a magic packet every 10 s.
  wakeAndWait = pkgs.writeShellApplication {
    name = "nas-wake-and-wait";
    runtimeInputs = [pkgs.bash pkgs.coreutils wake];
    text = ''
      # Runs as ExecStartPre of an Accept=yes service: stdout is the client socket.
      exec 1>&2
      port=$1
      up() { timeout 1 bash -c "</dev/tcp/${nasAddress}/$port" 2>/dev/null; }
      up && exit 0
      for _ in $(seq 1 9); do
        nas-wake
        for _ in $(seq 1 20); do
          up && exit 0
          sleep 0.5
        done
      done
      echo "NAS did not answer on port $port" >&2
      exit 1
    '';
  };

  # inverter/grid is published (retained) by Home Assistant, see
  # home-assistant/hass/configs/packages/inverter_grid.yaml.
  gridWake = pkgs.writeShellApplication {
    name = "nas-grid-wake";
    runtimeInputs = [pkgs.mosquitto wake];
    text = ''
      last=""
      mosquitto_sub -h 127.0.0.1 -t inverter/grid | while read -r state; do
        if [ "$state" = on ] && [ -n "$last" ] && [ "$last" != on ]; then
          echo "Grid is back, waking the NAS"
          nas-wake
        fi
        last=$state
      done
    '';
  };
in {
  systemd = lib.mkMerge (
    (map (port: {
        sockets."nas-proxy-${toString port}" = {
          wantedBy = ["sockets.target"];
          socketConfig = {
            ListenStream = "${listenAddress}:${toString port}";
            FreeBind = true;
            Accept = true;
            MaxConnections = 512;
          };
        };

        services."nas-proxy-${toString port}@" = {
          serviceConfig = {
            ExecStartPre = "${lib.getExe wakeAndWait} ${toString port}";
            ExecStart = "${lib.getExe pkgs.socat} STDIO TCP:${nasAddress}:${toString port}";
            StandardInput = "socket";
            StandardOutput = "socket";
            StandardError = "journal";
            TimeoutStartSec = 120;
          };
        };
      })
      ports)
    ++ [
      {
        services.nas-grid-wake = {
          description = "Wake the NAS when the grid comes back";
          wantedBy = ["multi-user.target"];
          after = ["mosquitto.service"];
          serviceConfig = {
            ExecStart = lib.getExe gridWake;
            Restart = "always";
            RestartSec = 10;
          };
        };
      }
    ]
  );
}
