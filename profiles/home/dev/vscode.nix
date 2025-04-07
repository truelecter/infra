{pkgs, ...}: {
  programs.vscode = {
    enable = true;
    package = pkgs.vscode;
    enableExtensionUpdateCheck = false;
    enableUpdateCheck = false;
    extensions = with pkgs.vscode-marketplace;
      [
        coolbear.systemd-unit-file
        davidanson.vscode-markdownlint
        christian-kohler.path-intellisense
        dbaeumer.vscode-eslint
        donjayamanne.githistory
        editorconfig.editorconfig
        ivory-lab.jenkinsfile-support
        jq-syntax-highlighting.jq-syntax-highlighting
        natqe.reload
        nicolasvuillamy.vscode-groovy-lint
        plorefice.devicetree
        redhat.vscode-commons
        redhat.vscode-xml
        eamodio.gitlens
        whi-tw.klipper-config-syntax
        roscop.activefileinstatusbar
        pkief.material-icon-theme
        tamasfe.even-better-toml
        mads-hartmann.bash-ide-vscode
        ericadamski.carbon-now-sh
        mkhl.direnv
        systemticks.c4-dsl-extension
        likec4.likec4-vscode
        ms-vscode-remote.remote-ssh
        ms-vscode-remote.remote-ssh-edit
      ]
      ++ (with pkgs.vscode-extensions; [
        #FIXME: for whatever reason, it is not in nix4vscode generated.nix
        redhat.vscode-yaml
      ]);
    userSettings = builtins.fromJSON (builtins.readFile ./_files/vscode-settings.json);
  };
}
