{pkgs, ...}: {
  fonts.packages = with pkgs; [
    powerline-fonts
    dejavu_fonts
    nerd-fonts.iosevka
    nerd-fonts.iosevka-term
    # (
    #   iosevka.override {
    #     set = "term";
    #     privateBuildPlan = {
    #       family = "Iosevka Term";
    #       spacing = "term";
    #       noLigation = "true";
    #     };
    #   }
    # )
    (
      iosevka-bin.override {
        variant = "SGr-IosevkaTerm";
      }
    )
    # (
    #   pkgs.iosevka.override {
    #     set = "Kitty";
    #     privateBuildPlan = {
    #       family = "Iosevka Kitty";
    #       spacing = "term";
    #       serifs = "sans";
    #       noCvSs = false;
    #       exportGlyphNames = true;

    #       variants = {
    #         inherits = "ss14";

    #         design = {
    #           number-sign = "upright";
    #           dollar = "open";
    #           cent = "open";
    #         };
    #       };

    #       weights = {
    #         Regular = {
    #           shape = 400;
    #           menu = 400;
    #           css = 400;
    #         };

    #         Bold = {
    #           shape = 700;
    #           menu = 700;
    #           css = 700;
    #         };
    #       };

    #       slopes = {
    #         Upright = {
    #           angle = 0;
    #           shape = "upright";
    #           menu = "upright";
    #           css = "normal";
    #         };

    #         Italic = {
    #           angle = 9.4;
    #           shape = "italic";
    #           menu = "italic";
    #           css = "italic";
    #         };
    #       };
    #     };
    #   }
    # )
  ];
}
