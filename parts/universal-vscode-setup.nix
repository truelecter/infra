{inputs, ...}: {
  flake.modules.homeManager.universal-vscode-setup = {
    pkgs,
    lib,
    config,
    options,
    ...
  }: let
    nix4vscode = inputs.nix4vscode.lib.${pkgs.stdenv.hostPlatform.system};

    profileOptionsType = options.programs.vscodium.profiles.type.getSubOptions [];

    ignoredOptions = [
      "extensions"
      "_module"
    ];

    profileOptions =
      {
        extensions = lib.mkOption {
          type = lib.types.listOf lib.types.str;
          default = [];
          description = ''
            Extensions to install in the profile. Will be evaluated to version of repective modules package.vscodeVersion
          '';
        };
      }
      // lib.filterAttrs (n: _: !(lib.elem n ignoredOptions)) profileOptionsType;

    unviersal = config.programs.vscode-universal;
  in {
    options.programs.vscode-universal = {
      profiles = lib.mkOption {
        type = lib.types.attrsOf (lib.types.submodule {options = profileOptions;});
        default = {};
        description = ''
          Profiles to install.
        '';
      };
    };

    config = let
      supportedDistributions = ["vscode" "vscodium" "cursor"];
      mkDistributionConfig = distribution: let
        renderExtentions = nix4vscode.forVscodeVersion config.programs.${distribution}.package.vscodeVersion;
      in {
        programs.${distribution} = {
          profiles = lib.mapAttrs (_: profile: profile // {extensions = renderExtentions profile.extensions;}) unviersal.profiles;
        };
      };
    in
      lib.mkMerge (map mkDistributionConfig supportedDistributions);
  };
}
