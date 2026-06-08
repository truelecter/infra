{pkgs, ...}: {
  output = "treefmt.toml";
  format = "toml";

  data = {
    global.excludes = ["**/sources/generated.*" "secrets/*" "parts/vscode-plugins/nix4vscode/generated.nix" ".direnv" "result"];
    formatter = {
      nix = {
        command = "${pkgs.alejandra}/bin/alejandra";
        includes = ["*.nix"];
      };
      prettier = {
        command = "${pkgs.prettier}/bin/prettier";
        # options = ["--plugin" "prettier-plugin-toml" "--write"];
        includes = [
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
          # "*.toml"
        ];
      };
      shell = {
        command = "${pkgs.shfmt}/bin/shfmt";
        options = ["-i" "2" "-s" "-w"];
        includes = ["*.sh"];
      };
    };
  };
}
