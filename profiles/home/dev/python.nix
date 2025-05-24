{pkgs, ...}: {
  programs.vscode.profiles.default = {
    extensions = with pkgs.vscode-marketplace; [
      ms-python.python
      ms-python.vscode-pylance
    ];

    userSettings = {
      "python.defaultInterpreterPath" = "${pkgs.python3}/bin/python3";
    };
  };
}
