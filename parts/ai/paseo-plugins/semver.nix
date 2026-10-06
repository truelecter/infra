# The subset of npm semver ranges that `requirements.paseo` in a plugin manifest uses: space-separated
# comparators that must all hold, each `>=`, `>`, `<=`, `<`, `=`, `~`, `^` or nothing before a full
# `major.minor.patch`. Anything else (`||`, `x` wildcards, prereleases) fails evaluation, so a manifest
# change can't silently skip the check. The pinned Paseo version may be a prerelease (`0.11.0-beta.5`):
# like Paseo's own check (`assertPluginCompatibility`), it is compared by its stable core (`0.11.0`).
{lib}: let
  parse = string: let
    match = builtins.match "([0-9]+)\\.([0-9]+)\\.([0-9]+)" string;
  in
    if match == null
    then throw "semver: expected major.minor.patch, got `${string}`"
    else map lib.toInt match;

  format = parts: lib.concatMapStringsSep "." toString parts;

  # Comparator -> list of { op, version } bounds.
  bounds = comparator: let
    match = builtins.match "(>=|<=|>|<|=|~|\\^)?(.*)" comparator;
    op =
      if builtins.head match == null
      then "="
      else builtins.head match;
    version = builtins.elemAt match 1;
    parts = parse version;
    major = builtins.elemAt parts 0;
    minor = builtins.elemAt parts 1;
    patch = builtins.elemAt parts 2;
    upper =
      if op == "~"
      then [major (minor + 1) 0]
      else if major > 0
      then [(major + 1) 0 0]
      else if minor > 0
      then [0 (minor + 1) 0]
      else [0 0 (patch + 1)];
  in
    if op == "~" || op == "^"
    then [
      {
        op = ">=";
        inherit version;
      }
      {
        op = "<";
        version = format upper;
      }
    ]
    else [{inherit op version;}];

  holds = version: bound: let
    order = builtins.compareVersions version bound.version;
  in
    {
      ">=" = order >= 0;
      ">" = order > 0;
      "<=" = order <= 0;
      "<" = order < 0;
      "=" = order == 0;
    }
    .${
      bound.op
    };
in {
  # satisfies "0.10.2" ">=0.10.0" -> true; satisfies "0.11.0" "~0.10.2" -> false;
  # satisfies "0.11.0-beta.5" "~0.11.0" -> true
  satisfies = version: range: let
    comparators = builtins.filter (part: part != "") (lib.splitString " " range);
    prerelease = builtins.match "([0-9]+\\.[0-9]+\\.[0-9]+)-[0-9A-Za-z.-]+" version;
    core =
      if prerelease == null
      then version
      else builtins.head prerelease;
  in
    builtins.seq (parse core) (
      comparators != [] && lib.all (holds core) (lib.concatMap bounds comparators)
    );
}
