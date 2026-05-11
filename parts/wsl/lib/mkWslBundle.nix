{
  stdenvNoCC,
  kernel,
  modulesImage,
}:
stdenvNoCC.mkDerivation {
  name = "wsl-bundle-${kernel.name}";

  inherit (kernel) src version;

  dontUnpack = true;
  dontBuild = true;
  dontPatch = true;

  passthru = {
    inherit kernel modulesImage;
  };

  installPhase = ''
    mkdir -p $out

    cp ${modulesImage} $out/modules.vhdx
    cp ${kernel}/bzImage $out/bzImage
  '';
}
