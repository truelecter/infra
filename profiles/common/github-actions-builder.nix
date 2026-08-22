{
  users.users.gha-builder = {
    isNormalUser = true;

    openssh.authorizedKeys.keys = [
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL5gBk/gVG6wVBdZrtOcGu6TPZCtGCOkgZMndSA3tS7j"
    ];
  };

  nix.settings = {
    trusted-users = ["gha-builder"];
  };
}
