{
  programs.vscode-universal = {
    profiles.default = {
      enableExtensionUpdateCheck = false;
      enableUpdateCheck = false;
      extensions = [
        "natqe.reload"
        "mkhl.direnv"
        "christian-kohler.path-intellisense"
        "pkief.material-icon-theme"

        "eamodio.gitlens"

        "ms-vscode-remote.remote-ssh"
        "ms-vscode-remote.remote-ssh-edit"

        # TODO: add config from extension page
        "davidanson.vscode-markdownlint"

        "editorconfig.editorconfig"
        "dbaeumer.vscode-eslint"
        "nicolasvuillamy.vscode-groovy-lint"

        # TODO: configure lsp for bash, shellcheck etc
        "mads-hartmann.bash-ide-vscode"

        # commaon file formats
        "redhat.vscode-commons"
        "redhat.vscode-xml"
        "redhat.vscode-yaml"
        "zixuanwang.linkerscript"
        "tamasfe.even-better-toml"
        "whi-tw.klipper-config-syntax"
        "coolbear.systemd-unit-file"
        "plorefice.devicetree"
        "ivory-lab.jenkinsfile-support"
        "jq-syntax-highlighting.jq-syntax-highlighting"
        # Evaluate
        # "repreng.csv"
        # "mechatroner.rainbow-csv"
        "janisdd.vscode-edit-csv"
      ];

      userSettings = builtins.fromJSON (builtins.readFile ./_files/vscode-settings.json);
    };
  };
}
