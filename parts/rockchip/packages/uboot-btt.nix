{
  buildUBoot,
  rkbin,
  sources,
  ...
}:
buildUBoot {
  inherit (sources.uboot) src version;

  extraPatches = [./_patches/uboot-btt-pi2-video.patch];

  defconfig = "bigtreetech-pi2-rk3566_defconfig";

  env = {
    ROCKCHIP_TPL = rkbin + "/bin/rk35/rk3566_ddr_1056MHz_v1.23.bin";
    BL31 = rkbin.BL31_RK3568;
  };

  filesToInstall = ["u-boot-rockchip.bin"];

  extraMeta.platforms = ["aarch64-linux"];
}
