{
  linuxPackages,
  kernel ? linuxPackages.kernel,
  ...
}:
# Mainline tc358762 bridge driver switched to DSI burst mode, installed under
# updates/ so it takes precedence over the in-tree module.
kernel.stdenv.mkDerivation {
  name = "tc358762-burst";

  inherit (kernel) version src;

  patches = [
    ./_patches/tc358762-burst.patch
  ];

  kernel = kernel.dev;
  kernelVersion = kernel.modDirVersion;

  modulePath = "drivers/gpu/drm/bridge";

  buildPhase = ''
    sourceRoot="$(pwd -P)"

    cd $sourceRoot/$modulePath

    echo 'obj-m += tc358762.o' > Makefile

    make -C $kernel/lib/modules/$kernelVersion/build modules "M=$(pwd -P)"

    cd $sourceRoot
  '';

  installPhase = ''
    cd $sourceRoot/$modulePath

    make \
      -C $kernel/lib/modules/$kernelVersion/build \
      INSTALL_MOD_PATH="$out" \
      XZ="xz -T$NIX_BUILD_CORES" \
      "M=$(pwd -P)" \
      modules_install
  '';
}
