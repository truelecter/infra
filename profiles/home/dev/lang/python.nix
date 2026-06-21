{pkgs, ...}: {
  programs.vscode-universal.profiles.default = {
    extensions = [
      "ms-python.python"
      "ms-python.vscode-pylance"
    ];

    userSettings = {
      "python.defaultInterpreterPath" = "${pkgs.python3}/bin/python3";
    };
  };
}
