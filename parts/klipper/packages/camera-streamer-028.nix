{
  lib,
  stdenv,
  fetchFromGitHub,
  srcOnly,
  # tools
  pkg-config,
  ccache,
  unixtools,
  # dependencies
  nlohmann_json,
  ffmpeg,
  libcamera,
  cmake,
  ninja,
  usrsctp,
  plog,
  openssl,
  srtp,
  gcc11Stdenv,
  # Build flags
  useHWH264 ? true,
  useFfmpeg ? false,
  useLibcamera ? false,
  useRtsp ? true, # Broken while live555 is not compiling for whatever reason
  useLibdatachannel ? true,
  libjuiceNoServer ? true,
  libjuiceNoTests ? true,
  ...
}: let
  inherit (lib) optionals optional optionalString;

  libjuice = stdenv.mkDerivation {
    pname = "libjuice";
    version = "v1.0.4";
    src = fetchFromGitHub {
      owner = "paullouisageneau";
      repo = "libjuice";
      rev = "v1.0.4";
      fetchSubmodules = false;
      sha256 = "sha256-LAqi5F6okhGj0LyJasPKRkUz6InlM6rbYN+1sX1N4Qo=";
    };

    cmakeFlags =
      optional libjuiceNoServer "-DNO_SERVER=ON"
      ++ optional libjuiceNoTests "-DNO_TESTS=ON";

    nativeBuildInputs = [cmake];

    meta = with lib; {
      description = "JUICE is a UDP Interactive Connectivity Establishment library";
      homepage = "https://github.com/paullouisageneau/libjuice/tree/06bbfe93ab344e95797220d89b55c7204c3ffa9d";
      platforms = platforms.linux;
      license = licenses.gpl3Only;
    };
  };

  customUsrsctp = usrsctp.overrideAttrs (finalAttrs: previousAttrs: {
    version = "unstable-2021-10-08";

    patches = [];

    src = fetchFromGitHub {
      owner = "sctplab";
      repo = "usrsctp";
      rev = "7c31bd35c79ba67084ce029511193a19ceb97447";
      hash = "sha256-KeOR/0WDtG1rjUndwTUOhE21PoS+ETs1Vk7jQYy/vNs=";
    };
  });

  libdatachannel0_17 = gcc11Stdenv.mkDerivation {
    pname = "libdatachannel";
    version = "v0.17.10";

    src = fetchFromGitHub {
      owner = "paullouisageneau";
      repo = "libdatachannel";
      rev = "v0.17.10";
      fetchSubmodules = false;
      sha256 = "sha256-3f84GxAgQiObe+DYuTQABvK+RTihKKFKaf48lscUex4=";
    };

    outputs = ["out" "dev"];
    strictDeps = true;

    nativeBuildInputs = [
      cmake
      ninja
      pkg-config
    ];

    buildInputs = [
      libjuice
      openssl
      srtp
    ];

    postPatch = ''
      # TODO: Remove when updating to 0.19.x, and add
      # -DUSE_SYSTEM_USRSCTP=ON and -DUSE_SYSTEM_PLOG=ON to cmakeFlags instead
      mkdir -p deps/{usrsctp,plog}
      cp -r --no-preserve=mode ${srcOnly customUsrsctp}/. deps/usrsctp
      cp -r --no-preserve=mode ${srcOnly plog}/. deps/plog
    '';

    cmakeFlags = [
      "-DUSE_SYSTEM_SRTP=ON"
      "-DUSE_SYSTEM_JUICE=ON"
      "-DNO_EXAMPLES=ON"
    ];

    meta = with lib; {
      description = "C/C++ WebRTC network library featuring Data Channels, Media Transport, and WebSockets";
      homepage = "https://libdatachannel.org/";
      license = with licenses; [mpl20];
      platforms = platforms.linux;
    };
  };

  live555Custom = stdenv.mkDerivation {
    pname = "live555";

    version = "2020.03.06";
    src = fetchTarball {
      url = "https://download.videolan.org/pub/contrib/live555/live.2020.03.06.tar.gz";
      sha256 = "sha256-UxunbrJC6UVlwexso/cuH9m+mUSf7WEPMLincUrqDWE=";
    };

    buildInputs = [openssl];

    # env.NIX_CFLAGS_COMPILE = "-DNO_STD_LIB";
    postPatch = ''
      sed -i -e 's|/bin/rm|rm|g' genMakefiles
      sed -i \
        -e 's/$(INCLUDES) -I. -O2 -DSOCKLEN_T/$(INCLUDES) -I. -O2 -I. -fPIC -DRTSPCLIENT_SYNCHRONOUS_INTERFACE=1 -DSOCKLEN_T/g' \
        config.linux
    '';

    configurePhase = ''
      runHook preConfigure

      ./genMakefiles linux

      runHook postConfigure
    '';

    makeFlags = [
      "DESTDIR=${placeholder "out"}"
      "PREFIX="
    ];

    enableParallelBuilding = true;

    meta = with lib; {
      homepage = "http://www.live555.com/liveMedia/";
      description = "Set of C++ libraries for multimedia streaming, using open standard protocols (RTP/RTCP, RTSP, SIP)";
      changelog = "http://www.live555.com/liveMedia/public/changelog.txt";
      license = licenses.lgpl21Plus;
      platforms = platforms.linux;
    };
  };
in
  stdenv.mkDerivation rec {
    pname = "camera-streamer";

    version = "v0.3.0";

    src = fetchFromGitHub {
      owner = "ayufan";
      repo = "camera-streamer";
      rev = "v0.2.8";
      fetchSubmodules = true;
      sha256 = "sha256-8vV8BMFoDeh22I1/qxk6zttJROaD/lrThBxXHZSPpT4=";
    };

    hardeningDisable = ["all"];

    makeFlags =
      [
        # Targets
        "camera-streamer"
        "list-devices"
        "GIT_VERSION=${version}"
        "GIT_REVISION=${version}"
        "USE_LIBDATACHANNEL=0"
      ]
      ++ optional useHWH264 "USE_HW_H264=1"
      ++ optional useFfmpeg "USE_FFMPEG=1"
      ++ optional useLibcamera "USE_LIBCAMERA=1"
      ++ optional useRtsp "USE_RTSP=1";

    nativeBuildInputs = [pkg-config ccache unixtools.xxd];

    buildInputs =
      [nlohmann_json]
      ++ optional useFfmpeg ffmpeg
      ++ optional useLibcamera libcamera
      ++ optionals useRtsp [openssl]
      ++ optionals useLibdatachannel ([libdatachannel0_17 usrsctp] ++ libdatachannel0_17.buildInputs);

    configurePhase = ''
      echo '#define GIT_VERSION "${version}"' > version.h
      echo '#define GIT_REVISION "${version}"' >> version.h

      sed -i 's/all: version/all:/g' Makefile

      ${optionalString useLibdatachannel ''
        export NIX_CFLAGS_COMPILE="-DUSE_LIBDATACHANNEL $NIX_CFLAGS_COMPILE"
        export NIX_LDFLAGS="$NIX_LDFLAGS -ljuice -ldatachannel -lsrtp2 -lcrypto -lssl -lusrsctp"
      ''}

      ${optionalString useRtsp ''
        export NIX_CFLAGS_COMPILE="$NIX_CFLAGS_COMPILE -isystem ${live555Custom}/include/liveMedia -isystem ${live555Custom}/include/groupsock -isystem ${live555Custom}/include/UsageEnvironment -isystem ${live555Custom}/include/BasicUsageEnvironment"
        export NIX_LDFLAGS="$NIX_LDFLAGS -L${live555Custom}/lib -lliveMedia -lgroupsock -lBasicUsageEnvironment -lUsageEnvironment"
      ''}

      rm -rf third_party/libdatachannel
    '';

    installPhase = ''
      $preInstallPhase

      mkdir -p $out/bin
      cp camera-streamer list-devices $out/bin/

      $postInstallPhase
    '';

    meta = with lib; {
      description = "High-performance low-latency camera streamer for Raspberry PI's";
      homepage = "https://github.com/ayufan/camera-streamer/tree/main";
      platforms = platforms.linux;
      # license = licenses.gpl3Only;
    };
  }
