{
  globalOptions,
  instanceConfig,
}: {lib, ...}: let
  l = builtins // lib;
  inherit (lib) types mkOption mkEnableOption;
  filteredOptions = [
    "_module"
    "backupCleanupCommand"
    "backupPrepareCommand"
    "user"
    "paths"
    "environmentFile"
    "runCheck"
  ];
in {
  options =
    {
      enable = mkEnableOption "Enable restic backup";

      environmentFile = mkOption {
        type = types.oneOf [(types.listOf types.str) types.str];
        default = [];
        description = lib.mdDoc ''
          File containing the credentials to access the repository, in the
          format of an EnvironmentFile as described by systemd.exec(5)
        '';
      };

      paths = mkOption {
        type = types.nullOr (types.listOf types.str);
        default = [
          instanceConfig.dirnames.state
        ];
        defaultText = "Path of the upperdir of server overlay";
        description = lib.mdDoc ''
          Which paths to backup. If null or an empty array, no
          backup command will be run.  This can be used to create a
          prune-only job.
        '';
      };
    }
    # Take most of the options from restic service options definition
    // l.filterAttrs (n: _: !(l.elem n filteredOptions)) (globalOptions.services.restic.backups.type.getSubOptions []);
}
