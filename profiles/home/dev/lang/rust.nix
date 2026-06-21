{
  programs.vscode-universal.profiles.default = {
    extensions = [
      "rust-lang.rust-analyzer"
      "vadimcn.vscode-lldb"
    ];

    userSettings = {
      "lldb.suppressUpdateNotifications" = true;
    };
  };
}
