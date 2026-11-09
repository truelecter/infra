# The VPS provider allows at most 100 Mbit/s, while the port is 10 Gbit/s and
# nix-proxy can saturate it. CAKE shapes egress on eth0 and ingress through an
# IFB device. BBR keeps working: TCP paces itself without the fq qdisc.
{pkgs, ...}: let
  dev = "eth0";
  ifb = "ifb4${dev}";
  bandwidth = "100mbit";
in {
  systemd.services."traffic-limit-${dev}" = {
    description = "Limit ${dev} traffic to ${bandwidth} in each direction";
    wantedBy = ["multi-user.target"];
    after = ["network-addresses-${dev}.service"];
    bindsTo = ["sys-subsystem-net-devices-${dev}.device"];

    path = [pkgs.iproute2];

    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
    };

    script = ''
      tc qdisc replace dev ${dev} root cake bandwidth ${bandwidth}

      ip link show ${ifb} >/dev/null 2>&1 || ip link add ${ifb} type ifb
      ip link set ${ifb} up
      tc qdisc replace dev ${ifb} root cake bandwidth ${bandwidth} ingress

      tc qdisc del dev ${dev} ingress 2>/dev/null || true
      tc qdisc add dev ${dev} handle ffff: ingress
      tc filter add dev ${dev} parent ffff: matchall action mirred egress redirect dev ${ifb}
    '';

    postStop = ''
      tc qdisc del dev ${dev} ingress || true
      tc qdisc del dev ${dev} root || true
      ip link del ${ifb} || true
    '';
  };
}
