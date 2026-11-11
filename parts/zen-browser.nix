{inputs, ...}: {
  flake.modules.homeManager.zen-browser = inputs.zen-browser.homeModules.beta;
}
