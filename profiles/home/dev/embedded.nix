{pkgs, ...}: {
  programs.vscode = {
    extensions =
      (
        with pkgs.vscode-marketplace; [
          rust-lang.rust-analyzer
          probe-rs.probe-rs-debugger
          zixuanwang.linkerscript

          marus25.cortex-debug
          mcu-debug.debug-tracker-vscode
          mcu-debug.memory-view
          mcu-debug.rtos-views
          mcu-debug.peripheral-viewer
        ]
      )
      ++ (
        with pkgs.vscode-extensions; [
          vadimcn.vscode-lldb
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
