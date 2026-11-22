# `esphome` with the device secrets from secrets/esphome.yaml and the Wi-Fi
# password from secrets/wifi.yaml. They go into the gitignored secrets.yaml
# next to the device configs only while the command runs, flattened to
# `<section>_<key>` (ritar_battery_monitor.api_key -> ritar_battery_monitor_api_key).
# Config paths are relative to nixos/hosts/x86_64/sirius/home-assistant/esphome,
# for example `esphome run battery-monitor.yaml`.
{pkgs, ...}: let
  esphome = pkgs.writeShellApplication {
    name = "esphome";
    runtimeInputs = [pkgs.sops pkgs.jq];
    text = ''
      dir="$PRJ_ROOT/nixos/hosts/x86_64/sirius/home-assistant/esphome"
      secrets="$dir/secrets.yaml"
      trap 'rm -f "$secrets"' EXIT
      umask 077
      {
        sops -d --output-type json "$PRJ_ROOT/secrets/esphome.yaml" | jq -r '
          to_entries[] | .key as $section | .value | to_entries[]
          | "\($section)_\(.key): \(.value | tojson)"'
        printf 'wifi_password: %s\n' \
          "$(sops -d --extract '["wireless290Pw"]' "$PRJ_ROOT/secrets/wifi.yaml" | jq -Rs .)"
      } > "$secrets"
      cd "$dir"
      ${pkgs.esphome}/bin/esphome "$@"
    '';
  };
in {
  commands = [
    {
      category = "home";
      package = esphome;
      help = "ESPHome with secrets from sops, e.g. `esphome run battery-monitor.yaml`";
    }
  ];
}
