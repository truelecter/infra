{
  lib,
  config,
  catalog,
  ...
}: let
  inherit (lib) types mkOption;

  cfg = config.tl.matrix;
in {
  options.tl.matrix = {
    server-name = mkOption {
      type = types.str;
      default = catalog.domains.media;
    };

    homeserver-hostname = mkOption {
      type = types.str;
      default = "matrix.${cfg.server-name}";
    };

    ui = mkOption {
      type = types.str;
      default = "element.${cfg.server-name}";
    };

    turn = mkOption {
      type = types.str;
      default = "turn.${cfg.server-name}";
    };

    admin = mkOption {
      type = types.str;
      default = "truelecter";
    };
  };
}
