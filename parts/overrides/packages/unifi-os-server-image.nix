# https://discourse.nixos.org/t/unifi-os-server-on-nixos/76039/3
{
  lib,
  pkgs,
  ...
}: let
  version = "5.0.6";
  # https://ui.com/download/software/unifi-os-server
  # FIXME: automate link retrieval
  url = "https://fw-download.ubnt.com/data/unifi-os-server/1856-linux-x64-${version}-33f4990f-6c68-4e72-9d9c-477496c22450.6-x64";
  sha256 = "sha256-IPoWR5GTiy7J1WgMEYdTxGo26qM2nO+U1c742pRo354=";
in
  pkgs.stdenvNoCC.mkDerivation {
    # reverse engineered via
    # https://www.unihosted.com/blog/running-unifi-os-server-in-docker
    pname = "unifi-os-server-image";
    inherit version;

    src = pkgs.fetchurl {
      inherit url sha256;
    };

    nativeBuildInputs = with pkgs; [
      binwalk
      coreutils
      findutils
    ];

    dontUnpack = true;

    outputs = [
      "out"
      # "image"
      "manifest"
    ];

    installPhase = ''
      set -euo pipefail

      work="$PWD/work"
      mkdir -p "$work"
      cp "$src" "$work/unifi-os-installer"
      chmod u+w "$work/unifi-os-installer"
      cd "$work"

      binwalk -e ./unifi-os-installer >/dev/null

      image_tar="$(find . -type f -name image.tar | head -n1)"
      if [ -z "$image_tar" ]; then
        echo "Could not find embedded image.tar in UniFi OS installer" >&2
        exit 1
      fi

      cp "$image_tar" "$out"
      # moveToOutput "$out/image.tar" "$image"

      mkdir "$work/extracted"
      tar -xf "$image_tar" -C "$work/extracted"

      cp "$work/extracted/manifest.json" "$manifest"
      # moveToOutput "$out/manifest.json" "$outputInfo"
    '';

    meta = with lib; {
      description = "Extracted OCI image archive from the UniFi OS Server installer";
      homepage = "https://help.ui.com/hc/en-us/articles/34210126298775-Self-Hosting-UniFi";
      license = licenses.unfreeRedistributableFirmware;
      platforms = platforms.linux;
      sourceProvenance = with sourceTypes; [binaryNativeCode];
    };
  }
