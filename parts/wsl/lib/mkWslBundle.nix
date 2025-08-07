{
  stdenvNoCC,
  kernel,
  modulesImage,
}:
stdenvNoCC.mkDerivation {
  name = "wsl-bundle-${kernel.name}";

  src = kernel.src;
  version = kernel.version;

  dontUnpack = true;
  dontBuild = true;
  dontPatch = true;

  installPhase = ''
    mkdir -p $out

    cp ${modulesImage} $out/modules.vhdx
    cp ${kernel}/bzImage $out/bzImage
  '';
}
