{
  config,
  lib,
  pkgs,
  modulesPath,
  ...
}: let
  inherit (lib) mkEnableOption mkOption types literalExpression mkMerge;

  mkEnabledOption = desc: (mkEnableOption desc) // {default = true;};
  mkBoolIntOpion = default: desc:
    (mkEnableOption desc)
    // {
      inherit default;
      apply = v:
        if v
        then 1
        else 0;
    };

  l = lib // builtins;
  cfg = config.tl.services.camera-streamer;
in {
  options.tl.services.camera-streamer = {
    instances = mkOption {
      description = "Set of camera-streamer instance.";
      default = {};

      type = types.attrsOf (types.submodule ({name, ...}: {
        options = {
          enable = mkEnabledOption "Enable this instance of camera-streamer.";

          package = mkOption {
            type = types.package;
            description = "camera-streamer package to be used in the module.";
            default = pkgs.camera-streamer;
            defaultText = literalExpression "pkgs.camera-streamer";
          };

          settings = {
            camera = {
              path = mkOption {
                type = types.nullOr types.str;
                description = "Chooses the camera to use. If empty connect to default.";
                default = null;
              };

              type = mkOption {
                type = types.enum ["v4l2" "libcamera" "dummy"];
                default = "dummy";
                description = "Select camera type.";
              };

              width = mkOption {
                type = types.number;
                default = 1920;
                description = "Set the camera capture width.";
              };

              height = mkOption {
                type = types.number;
                default = 1080;
                description = "Set the camera capture height.";
              };

              format = mkOption {
                type = types.enum [
                  "DEFAULT"
                  "YUYV"
                  "YUV420"
                  "YUYV"
                  "NV12"
                  "NV21"
                  "MJPG"
                  "MJPEG"
                  "JPEG"
                  "H264"
                  "RG10"
                  "GB10P"
                  "RG10P"
                  "BG10P"
                  "RGB565"
                  "RGBP"
                  "RGB24"
                  "RGB"
                  "BGR"
                ];
                default = "DEFAULT";
                description = "Set the camera capture format.";
              };

              nbufs = mkOption {
                type = types.ints.positive;
                default = 3;
                description = "Set number of capture buffers. Preferred 2 or 3.";
              };

              fps = mkOption {
                type = types.ints.positive;
                default = 30;
                description = "Set the desired capture framerate.";
              };

              allow_dma = mkBoolIntOpion true "Prefer to use DMA access to reduce memory copy.";

              high_res_factor = mkOption {
                type = types.nullOr types.number;
                default = null;
                description = "Set the desired high resolution output scale factor.";
              };

              low_res_factor = mkOption {
                type = types.nullOr types.number;
                default = null;
                description = "Set the desired low resolution output scale factor.";
              };

              options = mkOption {
                type = types.attrsOf (types.oneOf [types.str types.number]);
                default = {};
                example = {
                  brightness = 1;
                  sharpness = 5;
                };
                description = "Set the camera options. List all available options with `-camera-list_options`.";
              };

              auto_reconnect = mkBoolIntOpion true "Set the camera auto-reconnect delay in seconds.";
              auto_focus = mkBoolIntOpion true "Do auto-focus on start-up (does not work with all camera).";
              force_active = mkBoolIntOpion false "Force camera to be always active.";
              vflip = mkBoolIntOpion false "Do vertical image flip (does not work with all camera).";
              hflip = mkBoolIntOpion false "Do horizontal image flip (does not work with all camera).";

              isp.options = mkOption {
                type = types.attrsOf (types.oneOf [types.str types.number]);
                default = {};
                description = "Set the ISP processing options. List all available options with `-camera-list_options`.";
              };

              snapshot = {
                height = mkOption {
                  type = types.nullOr types.number;
                  default = null;
                  description = "Override the snapshot height and maintain aspect ratio.";
                };

                options = mkOption {
                  type = types.attrsOf (types.oneOf [types.str types.number]);
                  default = {};
                  description = "Set the JPEG compression options. List all available options with `-camera-list_options`.";
                };
              };

              stream = {
                disabled = mkBoolIntOpion false "Disable stream.";
                height = mkOption {
                  type = types.nullOr types.number;
                  default = null;
                  description = "Override the snapshot height and maintain aspect ratio.";
                };

                options = mkOption {
                  type = types.attrsOf (types.oneOf [types.str types.number]);
                  default = {};
                  description = "Set the JPEG compression options. List all available options with `-camera-list_options`.";
                };
              };

              video = {
                disabled = mkBoolIntOpion false "Disable video.";
                height = mkOption {
                  type = types.nullOr types.number;
                  default = null;
                  description = "Override the snapshot height and maintain aspect ratio.";
                };

                options = mkOption {
                  type = types.attrsOf (types.oneOf [types.str types.number]);
                  default = {};
                  description = "Set the H264 encoding options. List all available options with `-camera-list_options`.";
                };
              };
            };

            http = {
              listen = mkOption {
                type = types.str;
                default = "127.0.0.1";
                description = "Set the IP address the HTTP web-server will bind to. Set to 0.0.0.0 to listen on all interfaces.";
              };

              port = mkOption {
                type = types.ints.unsigned;
                default = 8080;
                description = "Set the HTTP web-server port.";
              };

              maxcons = mkOption {
                type = types.nullOr types.ints.positive;
                default = null;
                description = "Set maximum number of concurrent HTTP connections.";
              };
            };

            rtsp = {
              port = mkOption {
                type = types.ints.unsigned;
                default = 0;
                description = "Set the RTSP server port. Set 0 to disable";
              };
            };

            webrtc = {
              ice_servers = mkOption {
                type = types.listOf types.str;
                default = [];
                description = "Specify ICE servers: [(stun|turn|turns)(:|://)][username:password@]hostname[:port][?transport=udp|tcp|tls)].";
                apply = l.concatStringsSep ",";
              };

              disable_client_ice = mkBoolIntOpion false "Ignore ICE servers provided in '/webrtc' request.";
            };

            log = {
              debug = mkBoolIntOpion false "Enable debug logging.";
              verbose = mkBoolIntOpion false "Enable verbose logging.";
              stats = mkBoolIntOpion false "Print statistics every duration.";

              filter = mkOption {
                type = types.listOf types.str;
                default = [];
                example = ["buffer.cc"];
                description = "Enable debug logging from the given files.";
                apply = l.concatStringsSep ",";
              };
            };

            extra = mkOption {
              type = types.listOf types.str;
              description = "Additional options to be passed to this instance.";
              default = [];
              example = [""];
              # apply = l.concatStringsSep ",";
            };
          };

          nginx = {
            enable = mkEnableOption "Enable nginx reverse proxy on http port of the instance.";

            hostName = mkOption {
              type = types.str;
              default = "localhost";
              description = "Hostname to serve camera-streamer instance on.";
            };

            path = mkOption {
              type = types.str;
              default = "/camera/${name}/";
              defaultText = "/camera/<name of the instance>/";
              description = "Path to reverse-proxy on.";
            };

            extraConfig = mkOption {
              type =
                types.submodule
                (import "${modulesPath}/services/web-servers/nginx/location-options.nix" {inherit config lib;});
              default = {};
              description = "Extra configuration for the nginx location host for this instance.";
            };
          };
        };
      }));
    };
  };

  config = let
    enabledInstances = l.filterAttrs (_: x: x.enable) cfg.instances;
    nginxInstances = l.filterAttrs (_: x: x.nginx.enable) enabledInstances;

    httpPorts = l.mapAttrsToList (_: v: "${v.settings.http.listen}${l.toString v.settings.http.port}") (l.filterAttrs (_: x: x.settings.http.port != 0) enabledInstances);
    rtspPorts = l.mapAttrsToList (_: v: v.settings.rtsp.port) (l.filterAttrs (_: x: x.settings.rtsp.port != 0) enabledInstances);
  in {
    assertions = [
      {
        assertion = (l.unique httpPorts) == httpPorts;
        message = "Your http camera-server instances have overlapping server ports. They must be unique.";
      }
      {
        assertion = (l.unique rtspPorts) == rtspPorts;
        message = "Your rtsp camera-server instances have overlapping server ports. They must be unique.";
      }
      (
        let
          allPorts = httpPorts ++ rtspPorts;
        in {
          assertion = (l.unique allPorts) == allPorts;
          message = "Your camera-server instances have some overlapping ports among http and rtsp. They must all be unique.";
        }
      )
      (
        let
          hostnamePaths = l.mapAttrsToList (_: v: "${v.nginx.hostName}${v.nginx.path}") nginxInstances;
        in {
          assertion = (l.unique hostnamePaths) == hostnamePaths;
          message = "Your camera-server instances have overlapping nginx reverse-proxy paths.";
        }
      )
    ];

    systemd.services = l.mapAttrs' (name: icfg: let
      inherit (icfg) settings;

      stringifyOptions = f: a: l.mapAttrsToList f (l.filterAttrs (_: v: !(l.isAttrs v || l.isNull v || l.isList v || (l.isString v && v == ""))) a);

      cameraSimpleOptions = stringifyOptions (n: v: "--camera-${n}=${l.toString v}") settings.camera;
      cameraOptions = l.mapAttrsToList (n: v: "--camera-options=${n}=${l.toString v}") settings.camera.options;
      cameraISPOptions = l.mapAttrsToList (n: v: "--camera-isp.options=${n}=${l.toString v}") settings.camera.isp.options;

      cameraSnapshotOptions = l.mapAttrsToList (n: v: "--camera-snapshot.options=${n}=${l.toString v}") settings.camera.snapshot.options;
      cameraSnapshotSimpleOptions = stringifyOptions (n: v: "--camera-snapshot.${n}=${l.toString v}") settings.camera.snapshot;

      cameraStreamOptions = l.mapAttrsToList (n: v: "--camera-stream.options=${n}=${l.toString v}") settings.camera.stream.options;
      cameraStreamSimpleOptions = stringifyOptions (n: v: "--camera-stream.${n}=${l.toString v}") settings.camera.stream;

      cameraVideoOptions = l.mapAttrsToList (n: v: "--camera-video.options=${n}=${l.toString v}") settings.camera.video.options;
      cameraVideoSimpleOptions = stringifyOptions (n: v: "--camera-video.${n}=${l.toString v}") settings.camera.video;

      httpOptions = stringifyOptions (n: v: "--http-${n}=${l.toString v}") settings.http;
      rtspOptions = stringifyOptions (n: v: "--rtsp-${n}=${l.toString v}") settings.rtsp;
      webrtcOptions = stringifyOptions (n: v: "--webrtc-${n}=${l.toString v}") settings.webrtc;
      logOptions = stringifyOptions (n: v: "--log-${n}=${l.toString v}") settings.log;

      options = l.concatStringsSep " " (
        l.flatten [
          cameraSimpleOptions
          cameraOptions
          cameraISPOptions

          cameraSnapshotOptions
          cameraSnapshotSimpleOptions

          cameraStreamOptions
          cameraStreamSimpleOptions

          cameraVideoOptions
          cameraVideoSimpleOptions

          httpOptions
          rtspOptions
          webrtcOptions
          logOptions

          settings.extra
        ]
      );
    in
      l.nameValuePair "camera-streamer-${name}" {
        description = "camera-streamer ${name}";
        wantedBy = ["multi-user.target"];
        after = ["network.target"];

        serviceConfig = {
          Restart = "always";
          TimeoutStopSec = "5";
          DynamicUser = true;
          SupplementaryGroups = ["video"];
          AmbientCapabilities = "CAP_NET_BIND_SERVICE";
          ExecStart = "${icfg.package}/bin/camera-streamer ${options}";
        };
      })
    enabledInstances;

    services.nginx = {
      enable = true;
      upstreams = l.mapAttrs' (name: icfg:
        l.nameValuePair "camera-streamer-${name}" {
          servers."${icfg.settings.http.listen}:${l.toString icfg.settings.http.port}" = {};
        })
      nginxInstances;
      virtualHosts =
        l.foldlAttrs
        (
          acc: name: icfg:
            l.recursiveUpdate
            acc
            {
              "${icfg.nginx.hostName}".locations."${icfg.nginx.path}" =
                l.recursiveUpdate
                icfg.nginx.extraConfig
                {
                  proxyPass = "http://camera-streamer-${name}/";
                  proxyWebsockets = true;
                  extraConfig = ''
                    postpone_output 0;
                    proxy_buffering off;
                    proxy_ignore_headers X-Accel-Buffering;
                  '';
                };
            }
        )
        {}
        nginxInstances;
    };
  };
}
