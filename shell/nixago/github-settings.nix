{exts, ...}:
exts.ghsettings {
  repository = {
    name = "infra";
    description = "My Nix-managed stuff configuration";
    # homepage = "CONFIGURE-ME";
    topics = "nix, nixos, nix-darwin, flake-parts, flake, flakes, nix-flake, nix-flakes, haumea, deploy-rs, nixago";
    default_branch = "master";
    allow_squash_merge = true;
    allow_merge_commit = true;
    allow_rebase_merge = false;
    delete_branch_on_merge = true;
    private = false;
    has_issues = false;
    has_projects = false;
    has_wiki = false;
    has_downloads = false;
  };
  branches = [
    {
      name = "master";
      protection = {
        required_pull_request_reviews = null;
        required_status_checks = {
          strict = true;
          contexts = [
            "build_system"
            "build_shell"
          ];
        };
        enforce_admins = false;
        restrictions = null;
      };
    }
  ];
}
