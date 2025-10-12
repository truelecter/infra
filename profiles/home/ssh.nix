{flake, ...}: let
  hostnames = builtins.attrNames flake.deploy.nodes;
in {
  home.file = {
    ".ssh/config" = {
      text = ''
        Include ~/.ssh/config.local

        Host ${builtins.concatStringsSep " " hostnames}
          User truelecter
          ForwardAgent yes

        Host depsos
          Port 2265
      '';
    };
  };
}
