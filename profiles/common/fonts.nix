{pkgs, ...}: {
  fonts.packages = with pkgs; [
    powerline-fonts
    dejavu_fonts
    nerd-fonts.iosevka
    nerd-fonts.iosevka-term
  ];
}
