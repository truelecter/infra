{inputs, ...}: {
  imports = [
    "${inputs.files}/flake-module.nix"

    ./conform.nix
    ./editorconfig.nix
    ./github-settings.nix
  ];

  perSystem = {
    config,
    lib,
    ...
  }: {
    # Rewrites the generated files on shell entry; `nix flake check` fails when a
    # committed copy differs from its Nix source.
    devshells.default = {
      packages = [config.files.writer.drv];

      devshell.startup.files.text = lib.getExe config.files.writer.drv;
    };
  };
}
