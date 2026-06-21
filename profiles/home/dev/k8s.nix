{pkgs, ...}: let
  helm-wrapped = pkgs.wrapHelm pkgs.kubernetes-helm {plugins = [pkgs.kubernetes-helmPlugins.helm-diff];};
in {
  programs.vscode-universal.profiles.default = {
    extensions = [
      "tim-koehler.helm-intellisense"
    ];
  };

  home.packages = with pkgs; [
    helm-wrapped

    kubectl
    kubelogin-oidc

    dive
  ];

  programs.k9s = {
    enable = true;
  };
}
