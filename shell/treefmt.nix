{
  inputs,
  lib,
  ...
}: {
  imports = [inputs.treefmt-nix.flakeModule];

  perSystem = {config, ...}: {
    treefmt = {
      projectRootFile = "flake.nix";

      settings.global.excludes =
        [
          "**/sources/generated.*"
          "secrets/*"
          "parts/vscode-plugins/nix4vscode/generated.nix"
          ".direnv"
          "result"
        ]
        # Generated from Nix (shell/files); formatting them would break the files checks.
        ++ lib.attrNames config.files.file;

      programs = {
        alejandra.enable = true;
        shfmt.enable = true;
        prettier.enable = true;
      };

      settings.formatter.prettier.includes = lib.mkForce [
        "*.css"
        "*.html"
        "*.js"
        "*.json"
        "*.jsx"
        "*.md"
        "*.mdx"
        "*.scss"
        "*.ts"
        "*.yaml"
      ];
    };

    devshells.default.packages = [config.treefmt.build.wrapper];
  };
}
