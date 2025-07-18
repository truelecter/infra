{
  config,
  pkgs,
  ...
}: {
  programs.vscode.profiles.default = {
    extensions =
      pkgs.nix4vscode.forVscodeVersion config.programs.vscode.package.vscodeVersion
      [
        "4ops.packer"
        "hashicorp.terraform"
      ];

    userSettings = {
      "[terraform]" = {
        "editor.defaultFormatter" = "hashicorp.terraform";
        "editor.formatOnSave" = true;
      };
      "terraform.experimentalFeatures.validateOnSave" = true;
      "terraform.experimentalFeatures.prefillRequiredFields" = true;
      "terraform.languageServer.path" = "${pkgs.terraform-ls}/bin/terraform-ls";
      "terraform.languageServer.terraform.path" = "${pkgs.terraform}/bin/terraform";
      "terraform.codelens.referenceCount" = true;
    };
  };
  home.packages = with pkgs; [
    tfenv
    terragrunt
  ];

  home.file = {
    ".terraformrc" = let
      plugin-cache-dir = "${config.xdg.cacheHome}/terraform/plugin-cache";
    in {
      onChange = ''
        mkdir -p ${plugin-cache-dir}
      '';
      text = ''
        plugin_cache_dir = "${plugin-cache-dir}"
      '';
    };
  };
}
