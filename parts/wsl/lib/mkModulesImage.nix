{
  kernel,
  stdenv,
  qemu-utils,
  coreutils,
  volumeLabel ? "${kernel.name}-modules",
  uuid ? "55555555-5555-5555-9999-999999999999",
  fakeroot,
  libfaketime,
  e2fsprogs,
}:
stdenv.mkDerivation {
  name = "wsl-modules-${kernel.name}.vhdx";

  version = kernel.version;
  src = kernel.src;

  nativeBuildInputs = [
    qemu-utils
    coreutils
    e2fsprogs.bin
    libfaketime
    fakeroot
  ];

  buildPhase = ''
    img=temp.img

    mkdir -p ./rootImage

    cp -r "${kernel}/lib/modules/${kernel.modDirVersion}"/* ./rootImage

    numInodes=$(find ./rootImage | wc -l)
    numDataBlocks=$(du -s -c -B 4096 --apparent-size ./rootImage | tail -1 | awk '{ print int($1 * 1.20) }')
    bytes=$((2 * 4096 * $numInodes + 4096 * $numDataBlocks))

    echo "Creating an EXT4 image of $bytes bytes (numInodes=$numInodes, numDataBlocks=$numDataBlocks)"

    mebibyte=$(( 1024 * 1024 ))

    # Round up to the nearest mebibyte
    if (( bytes % mebibyte )); then
      bytes=$(( ( bytes / mebibyte + 1) * mebibyte ))
    fi

    truncate -s $bytes $img

    faketime -f "1970-01-01 00:00:01" fakeroot mkfs.ext4 -L ${volumeLabel} -U ${uuid} -d ./rootImage $img

    export EXT2FS_NO_MTAB_OK=yes
    # I have ended up with corrupted images sometimes, I suspect that happens when the build machine's disk gets full during the build.
    if ! fsck.ext4 -n -f $img; then
      echo "--- Fsck failed for EXT4 image of $bytes bytes (numInodes=$numInodes, numDataBlocks=$numDataBlocks) ---"
      cat errorlog
      return 1
    fi

    # shrink to fit
    resize2fs -M $img

    # Add 16 MebiByte to the current_size
    new_size=$(dumpe2fs -h $img | awk -F: \
      '/Block count/{count=$2} /Block size/{size=$2} END{print (count*size+16*2**20)/size}')

    resize2fs $img $new_size

    qemu-img convert -O vhdx "$img" "$out"
  '';

  dontInstall = true;
  dontUnpack = true;
  dontPatch = true;
}
