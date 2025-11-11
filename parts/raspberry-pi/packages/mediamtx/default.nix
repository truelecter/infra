{
  stdenv,
  lib,
  sources,
  buildGo125Module,
  # rpicamera dependencies
  meson,
  cmake,
  libcamera,
  freetype,
  pkg-config,
  libjpeg,
  openh264,
  ninja,
  # hls-js dependencies
  unzip,
  stdenvNoCC,
  # build flags
  withRpiCamera ? true,
  ...
}: let
  rpi-camera-embed = stdenv.mkDerivation {
    pname = "mediamtx-rpicamera";

    inherit (sources.mediamtx-rpicamera) version src;

    nativeBuildInputs = [
      pkg-config
      meson
      cmake
      ninja
    ];

    patches = [
      ./mediamtx-rpicamera.patch
    ];

    buildInputs = [
      libcamera
      freetype
      libjpeg
      openh264
    ];

    meta = with lib; {
      description = "Raspberry Pi Camera component for MediaMTX ";
      homepage = "https://github.com/bluenviron/mediamtx-rpicamera/";
      license = licenses.mit;
      # platforms = platforms.arm ++ platforms.aarch64 ++ platforms.armv7 ++ platforms.aarch;
    };
  };

  hls-js = stdenvNoCC.mkDerivation {
    pname = "hls-js";

    inherit (sources.hls-js) version src;

    nativeBuildInputs = [
      unzip
    ];

    dontConfigure = true;
    dontBuild = true;

    installPhase = ''
      mkdir -p $out/lib/
      cp -r hls.min.js $out/lib/
    '';
  };
in
  buildGo125Module rec {
    pname = "mediamtx";

    inherit (sources.mediamtx) version src;

    vendorHash = "sha256-/k0fIxL6x1X1kDNuMVWb40nkXbl+IakSYUgugd8vlLk=";

    # Tests need docker
    doCheck = false;

    tags = [
      "rpicamera"
    ];

    patches = [
      ./mediamtx.patch
    ];

    ldflags = [
      "-X github.com/aler9/mediamtx/internal/core.version=v${version}"
    ];

    postPatch = let
      rpiCameraPrefix =
        if stdenv.hostPlatform.isAarch64
        then "mtxrpicam_64"
        else "mtxrpicam_32";
    in ''
      ${
        lib.optionalString withRpiCamera
        ''
          mkdir internal/staticsources/rpicamera/${rpiCameraPrefix}
          cp ${rpi-camera-embed}/bin/mtxrpicam internal/staticsources/rpicamera/${rpiCameraPrefix}
        ''
      }
      # go generate ./...
      echo ${version} > internal/core/VERSION
      cp ${hls-js}/lib/hls.min.js internal/servers/hls/hls.min.js
    '';

    meta = with lib; {
      description = "Ready-to-use RTSP server and RTSP proxy that allows to read and publish video and audio streams";
      homepage = "https://github.com/bluenviron/mediamtx";
      license = licenses.mit;
    };
  }
