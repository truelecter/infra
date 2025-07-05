{
  pkgs,
  config,
  ...
}: {
  programs.vscode.profiles.default = {
    extensions = (
      pkgs.nix4vscode.forVscodeVersion config.programs.vscode.package.vscodeVersion
      [
        "rust-lang.rust-analyzer"
        "probe-rs.probe-rs-debugger"
        "zixuanwang.linkerscript"

        "marus25.cortex-debug"
        "mcu-debug.debug-tracker-vscode"
        "mcu-debug.memory-view"
        "mcu-debug.rtos-views"
        "mcu-debug.peripheral-viewer"
        "vadimcn.vscode-lldb"
      ]
    );
    # userSettings = {
    #   "rust-analyzer.cargo.target" = "thumbv7em-none-eabihf";
    #   "rust-analyzer.cargo.extraArgs" = [
    #     "--target"
    #     "thumbv7em-none-eabihf"
    #   ];
    #   "rust-analyzer.check.allTargets" = false;
    # };
  };
}
