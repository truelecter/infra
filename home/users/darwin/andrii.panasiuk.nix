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
  # Sonnet 5+ on Bedrock rejects the `temperature: 0` that smol jobs (skill description
  # compression) send; Haiku 4.5 accepts it (can1357/oh-my-pi#13636).
  haiku45 = bedrock "anthropic.claude-haiku-4-5-20251001-v1:0";
  gpt6 = name: bedrock "openai.gpt-6-${name}";

  # Every thinking level for models the omp catalog lists only up to `high` (Opus/Sonnet 5.5
  # before omp 18.4.1, can1357/oh-my-pi#13274) or without `xhigh` (Opus 4.8).
  adaptiveThinking = {
    thinking = {
      mode = "anthropic-adaptive";
      efforts = ["low" "medium" "high" "xhigh" "max"];
      supportsDisplay = true;
    };
  };
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
          smol = haiku45 "low";
          tiny = haiku45 "low";
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
          slow = [(opus48 "xhigh")];
          plan = [(opus48 "xhigh")];
          task = [(opus48 "medium")];
          deep-research = [(opus55 "max") (opus48 "max")];
          gsd-deep = [(opus48 "xhigh")];
          gsd-heavy = [(opus48 "high")];
          gsd-exec = [(opus48 "medium")];
        };
      };

      models.providers.amazon-bedrock.modelOverrides = {
        "global.anthropic.claude-opus-5-5" = adaptiveThinking;
        "global.anthropic.claude-sonnet-5-5" = adaptiveThinking;
        "global.anthropic.claude-opus-4-8" = adaptiveThinking;
      };
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
