{
  hmSuites,
  config,
  ...
}: let
  username = "andrii.panasiuk";

  inherit (config.users.users.${username}) home;

  # Bedrock model ids with a thinking level: `opus55 "high"`.
  bedrock = id: level: "amazon-bedrock/global.${id}:${level}";
  opus55 = bedrock "anthropic.claude-opus-5-5";
  opus48 = bedrock "anthropic.claude-opus-4-8";
  sonnet55 = bedrock "anthropic.claude-sonnet-5-5";
  fable51 = bedrock "anthropic.claude-fable-5-1";
  gpt6 = name: bedrock "openai.gpt-6-${name}";
in {
  imports = [
    (import ./__common-gui.nix {inherit username;})
  ];

  home-manager.users.${username} = {
    imports = hmSuites.workstation;

    # OMP on Amazon Bedrock: the roles routed to in profiles/home/dev/ai.nix, mapped to models.
    programs.oh-my-pi = {
      settings = {
        modelRoles = {
          default = opus55 "high";
          slow = opus55 "xhigh";
          plan = opus55 "xhigh";
          task = opus55 "medium";
          smol = sonnet55 "low";
          tiny = sonnet55 "low";
          commit = gpt6 "luna" "low";
          review = gpt6 "astra" "high";
          secreview = gpt6 "sol" "high";
          frontier = fable51 "high";
          deep-research = fable51 "max";
          gsd-deep = opus55 "xhigh";
          gsd-heavy = opus55 "high";
          gsd-exec = opus55 "medium";
          gsd-standard = sonnet55 "high";
          gsd-light = sonnet55 "medium";
          gsd-review = gpt6 "astra" "high";
          gsd-security = gpt6 "sol" "high";
        };

        retry.fallbackChains = {
          default = [(opus48 "high")];
          # Opus 4.8 on Bedrock has no `xhigh` in the omp catalog.
          slow = [(opus48 "max")];
          plan = [(opus48 "max")];
          task = [(opus48 "medium")];
          deep-research = [(opus55 "max") (opus48 "max")];
          gsd-deep = [(opus48 "max")];
          gsd-heavy = [(opus48 "high")];
          gsd-exec = [(opus48 "medium")];
        };
      };
    };

    # Per user: the model Paseo generates agent titles, branch names, commit and PR text with (the
    # thinking level goes in thinkingOptionId, not in the model id), and the Tunnelblick VPN plugin
    # for this machine's work VPN. The rest of programs.paseo is in profiles/home/dev/ai.nix.
    programs.paseo = {
      settings.agents.metadataGeneration.providers = [
        {
          provider = "omp";
          model = "amazon-bedrock/global.anthropic.claude-haiku-5-5";
          thinkingOptionId = "low";
        }
      ];
      plugins.vpn = {};
    };
  };

  system.defaults.dock.persistent-apps = [
    "/Applications/Zen.app"
    "${home}/Applications/Home Manager Apps/Ghostty.app"
    "${home}/Applications/Home Manager Apps/Cursor.app"
    "${home}/Applications/Home Manager Apps/Paseo.app"
    "/Applications/Slack.app"
    "/System/Applications/Mail.app"
    "/System/Applications/Calendar.app"
    "/Applications/Cisco/Cisco Secure Client.app"
    "/Applications/OpenVPN Connect/OpenVPN Connect.app"
  ];
}
