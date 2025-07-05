{
  pkgs,
  config,
  ...
}: let
  helm-wrapped = pkgs.wrapHelm pkgs.kubernetes-helm {plugins = [pkgs.kubernetes-helmPlugins.helm-diff];};
in {
  programs.vscode.profiles.default = {
    extensions =
      pkgs.nix4vscode.forVscodeVersion config.programs.vscode.package.vscodeVersion
      [
        "lunuan.kubernetes-templates"
        "ipedrazas.kubernetes-snippets"
        "ms-kubernetes-tools.vscode-kubernetes-tools"
        "tim-koehler.helm-intellisense"
      ];

    userSettings = {
      "vscode-kubernetes.kubectl-path" = "${pkgs.kubectl}/bin/kubectl";
      "vscode-kubernetes.helm-path" = "${helm-wrapped}/bin/helm";
      "vscode-kubernetes.log-viewer.follow" = true;
      # "vs-kubernetes" = {
      #   "vscode-kubernetes.kubectl-path" = "${pkgs.kubectl}/bin/kubectl";
      #   "vscode-kubernetes.helm-path" = "${pkgs.kubernetes-helm}/bin/helm";
      #   "vscode-kubernetes.log-viewer.follow" = true;
      # };
    };
  };

  home.packages = with pkgs; [
    helm-wrapped

    kubectl

    dive
    kubelogin-oidc
    minikube
  ];

  programs.k9s = {
    enable = true;
  };
}
