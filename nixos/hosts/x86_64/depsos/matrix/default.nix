{
  imports = [
    ./modules/mautrix-discord.nix

    ./options.nix
    ./synapse.nix
    ./element.nix
    ./db.nix

    ./bridges/telegram.nix
  ];
}
