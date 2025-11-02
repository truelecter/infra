{
  lib,
  stdenv,
  sources,
  # tools
  pkg-config,
  ccache,
  unixtools,
  cmake,
  # dependencies
  nlohmann_json,
  ffmpeg,
  libcamera,
  usrsctp,
  openssl,
  srtp,
  plog,
  # Build flags
  useHWH264 ? true,
  useFfmpeg ? false,
  useLibcamera ? true,
  useLibdatachannel ? true,
  ...
}:
stdenv.mkDerivation rec {
  pname = "camera-streamer";

  inherit (sources.camera-streamer) version src;

  hardeningDisable = ["all"];

  makeFlags =
    [
      # Targets
      "camera-streamer"
      # "list-devices"
      "GIT_VERSION=${version}"
      "GIT_REVISION=${version}"
      # "USE_LIBDATACHANNEL=0"
      "USE_RTSP=0"
    ]
    ++ lib.optional useHWH264 "USE_HW_H264=1"
    ++ lib.optional useFfmpeg "USE_FFMPEG=1"
    ++ lib.optional useLibcamera "USE_LIBCAMERA=1"
    # ++ optional useRtsp "USE_RTSP=1"
    ;

  nativeBuildInputs = [pkg-config ccache unixtools.xxd cmake];

  passthru = {
    inherit useLibcamera libcamera;
  };

  buildInputs =
    [nlohmann_json]
    ++ lib.optional useFfmpeg ffmpeg
    ++ lib.optional useLibcamera libcamera
    ++ lib.optionals useLibdatachannel [
      openssl
      srtp
      usrsctp
      plog
    ];

  prePatch = ''
    # patch libdatachannel offending line leading to msid attribute issues
    # sed -i 's/mAttributes.emplace_back("msid:"/\/\/mAttributes.emplace_back("msid:"/g' third_party/libdatachannel/src/description.cpp

    sed -i 's/all: version/all:/g' Makefile
    sed -i 's/git submodule update/#git submodule update/g' Makefile
  '';

  configurePhase = ''
    GIT_VERSION=${version} GIT_REVISION=${version} make version
  '';

  installPhase = ''
    $preInstallPhase

    mkdir -p $out/bin
    cp camera-streamer $out/bin/

    $postInstallPhase
  '';

  meta = with lib; {
    description = "High-performance low-latency camera streamer for Raspberry PI's";
    homepage = "https://github.com/ayufan/camera-streamer/tree/main";
    platforms = platforms.linux;
    # license = licenses.gpl3Only;
  };
}
