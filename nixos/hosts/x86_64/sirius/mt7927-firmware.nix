{
  lib,
  stdenvNoCC,
  fetchurl,
}:
# linux-firmware tag 20260519. The mt7927-nixos module still extracts the
# June 2025 ASUS zip (WM build 20250606201037) and that copy wins the
# firmware merge. These two files are MediaTek's submission and must outrank it.
let
  version = "20260519";
  fetchBlob = name: hash:
    fetchurl {
      url = "https://gitlab.com/kernel-firmware/linux-firmware/-/raw/${version}/mediatek/mt7927/${name}";
      inherit hash;
    };
in
stdenvNoCC.mkDerivation {
  pname = "mediatek-mt7927-wifi-firmware";
  inherit version;

  dontUnpack = true;
  dontBuild = true;

  installPhase = ''
    runHook preInstall
    dest="$out/lib/firmware/mediatek/mt7927"
    mkdir -p "$dest"
    install -m644 ${fetchBlob "WIFI_RAM_CODE_MT6639_2_1.bin" "sha256-6EH17U/lR/8vFSdaLzMLsZolPbkuPlnL39hYHXKyWC0="} \
      "$dest/WIFI_RAM_CODE_MT6639_2_1.bin"
    install -m644 ${fetchBlob "WIFI_MT6639_PATCH_MCU_2_1_hdr.bin" "sha256-elqs9o7YUmwdlLqWL4QEZJazkJVi3s+LtpDPvY3ltl4="} \
      "$dest/WIFI_MT6639_PATCH_MCU_2_1_hdr.bin"
    runHook postInstall
  '';

  meta = {
    description = "MT7927 Wi-Fi firmware from linux-firmware ${version}";
    license = lib.licenses.unfreeRedistributableFirmware;
    platforms = lib.platforms.linux;
  };
}
