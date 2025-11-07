{
  pkgs,
  engines,
}: data: let
  lefthook = pkgs.lefthook;

  # Add an extra hook for adding required stages whenever the file changes
  skip_attrs = [
    "colors"
    "extends"
    "skip_output"
    "source_dir"
    "source_dir_local"
  ];
  stages = builtins.attrNames (builtins.removeAttrs data skip_attrs);
  stagesStr = builtins.concatStringsSep " " stages;
  extra = ''
    # Install configured hooks
    for stage in ${stagesStr}; do
      ${lefthook}/bin/lefthook add "$stage"
    done
  '';
in {
  inherit data;
  format = "yaml";
  output = "lefthook.yml";
  hook = {inherit extra;};
  engine = engines.cue {
    files = [./template.cue];
  };
}
