{pkgs, ...}: let
  inherit
    (pkgs)
    writeScriptBin
    ssh-to-pgp
    ssh-to-age
    ;

  fetch-sops-nix-ssh-key = writeScriptBin "fetch-sops-nix-ssh-key" ''
    set -e -o pipefail

    show_usage() {
      echo "$0 <ssh-address> <hostname>"
    }

    if [[ "$#" -lt 2 ]]; then
      show_usage
      exit 1
    fi

    ssh $1 "sudo cat /etc/ssh/ssh_host_rsa_key" | ${ssh-to-pgp}/bin/ssh-to-pgp -o $PRJ_ROOT/cells/repo/keys/hosts/$2.asc

    git add $PRJ_ROOT/cells/repo/keys/hosts/$2.asc
  '';

  fetch-sops-nix-age-key = pkgs.writeScriptBin "fetch-sops-nix-age-key" ''
    set -e -o pipefail

    show_usage() {
      echo "$0 <ssh-address>"
    }

    if [[ "$#" -lt 1 ]]; then
      show_usage
      exit 1
    fi

    ssh-keyscan $1 | ${ssh-to-age}/bin/ssh-to-age
  '';
in {
  commands = [
    {
      package = pkgs.sops;
      category = "secrets";
    }
    {
      package = ssh-to-age;
      category = "secrets";
    }
    {
      package = pkgs.gnupg;
      category = "secrets";
    }
    {
      category = "secrets";
      name = "sops-reencrypt";
      help = "update keys for all sops file";
      command = ''
        ${pkgs.fd}/bin/fd -t file '.*' -E '*.pub' $PRJ_ROOT/secrets --exec sops updatekeys --yes
      '';
    }
    {
      category = "secrets";
      name = "fetch-sops-nix-ssh-key";
      help = "Fetch target host info for sops (GPG)";
      package = fetch-sops-nix-ssh-key;
    }
    {
      category = "secrets";
      name = "fetch-sops-nix-age-key";
      help = "Fetch target host info for sops (age)";
      package = fetch-sops-nix-age-key;
    }
    {
      package = pkgs.age;
      category = "secrets";
    }
    {
      package = pkgs.age-plugin-yubikey;
      category = "secrets";
    }
  ];
}
