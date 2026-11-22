# `<host>.local` over mDNS for hosts on the home LAN.
{
  lib,
  config,
  options,
  catalog,
  ...
}: let
  onLan = catalog.hosts.${config.networking.hostName}.net ? x290;
in
  lib.mkIf onLan {
    services.avahi =
      {
        enable = true;
        nssmdns4 = true;
      }
      # nixpkgs 26.11 moved the daemon options under `settings`.
      // (
        if options.services.avahi ? settings
        then {
          settings.publish = {
            disable-publishing = false;
            publish-addresses = true;
          };
        }
        else {
          publish = {
            enable = true;
            addresses = true;
          };
        }
      );

    # One mDNS stack: avahi's.
    services.resolved.settings.Resolve.MulticastDNS = lib.mkIf config.services.resolved.enable false;
  }
