{inputs, ...}: {
  imports = [inputs.flake-parts.flakeModules.touchup];

  # Remove it
  touchup.attr.formatter.enable = false;
}
