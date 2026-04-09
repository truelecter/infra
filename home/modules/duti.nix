{
  config,
  lib,
  pkgs,
  ...
}: let
  cfg = config.tl.services.duti;

  associationsConfig = pkgs.writeText "duti.conf" cfg.associations;
in {
  options.tl.services.duti = {
    enable = lib.mkEnableOption "Configure file associations with duti";

    package = lib.mkOption {
      type = lib.types.package;
      default = pkgs.duti;
      defaultText = lib.literalExpression "pkgs.duti";
      description = "duti package to use";
    };

    associations = lib.mkOption {
      type = lib.types.lines;
      description = "Associations to set with duti";
      default = "";
      example = ''
        com.sublimetext.4 public.plain-text all
      '';
    };
  };

  config = lib.mkIf cfg.enable {
    home = {
      packages = [cfg.package];

      activation.setFileAssociations =
        if cfg.associations != ""
        then ''
          echo "Setting file associations with duti..."
          ${cfg.package}/bin/duti ${associationsConfig}
        ''
        else ''
          echo "No file associations to set with duti..."
        '';
    };
  };
}
