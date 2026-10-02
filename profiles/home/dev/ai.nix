{
  config,
  pkgs,
  lib,
  ...
}: let
  searxngServer = config.services.searxng.settings.server;
  agents = [
    pkgs.paseo-desktop
  ];

  toolkits = with pkgs; [
    spec-kit
    openspec
  ];

  pythonWithPackages = pkgs.python3.withPackages (ps: [
    ps.pip
  ]);

  # Common tools expected by agents
  commonTools = with pkgs; [
    ripgrep
    nodejs
    fd
    pythonWithPackages
    uv
  ];

  gsdAgents = role: names: lib.genAttrs (map (name: "gsd-${name}") names) (_: "@${role}");
in {
  home.packages =
    agents
    ++ toolkits
    ++ commonTools;

  # Local SearXNG backs OMP's web_search; JSON output is what OMP's provider queries.
  services.searxng = {
    enable = true;
    settings = {
      server = {
        bind_address = "127.0.0.1";
        port = 8888;
      };
      search.formats = ["html" "json"];
    };
  };

  programs.oh-my-pi = {
    enable = true;

    # Loaded in this order. aws-profile does nothing unless OMP_BEDROCK_AWS_PROFILE is set, and
    # must run before anything calls Bedrock.
    extensions = with pkgs.omp-extensions; [
      aws-profile
      mcp-ready
      caveman
      paseo-agent-id
      say
      gsd
    ];

    mutableSettings = true;

    settings = {
      # Local SearXNG first. Its default scraped engines (DuckDuckGo, Brave, Startpage) block
      # bots, so queries go to engines that answer. Exa and Parallel work without an API key and
      # take over when SearXNG is down or returns nothing.
      modelRoles.web = "web/searxng";
      retry.fallbackChains.web = ["web/exa" "web/parallel"];
      searxng = {
        endpoint = "http://${searxngServer.bind_address}:${toString searxngServer.port}";
        engines = "google, bing, mojeek, github, wikipedia";
      };

      providers.cacheRetention = "long";

      # GSD skills that can't work with the store install (update, surface), don't fit this setup,
      # or only list other commands. GSD hooks call code-review, validate-phase, secure-phase,
      # ui-review, ui-phase, and ai-integration-phase by name, so those stay visible.
      skills.ignoredSkills = [
        "gsd-update"
        "gsd-surface"
        "gsd-ultraplan-phase"
        "gsd-profile-user"
        "gsd-inbox"
        "gsd-mempalace-*"
        "gsd-ns-*"
        "gsd-workspace"
        "gsd-workstreams"
        "gsd-thread"
        "gsd-graphify"
        "gsd-sketch"
        "gsd-stats"
      ];

      tools = {
        approvalMode = "write";
        # Paseo retitling (see the paseo-agent-id extension) without an approval card.
        approval.update_agent = "allow";
      };

      bash.direnvLoadTimeoutMs = 120000;

      task = {
        isolation.enabled = true;
        agentModelOverrides =
          {
            reviewer = "@review";
            security-reviewer = "@secreview";
          }
          // gsdAgents "gsd-deep" ["planner" "project-researcher" "debugger"]
          // gsdAgents "gsd-heavy" ["phase-researcher" "verifier"]
          // gsdAgents "gsd-exec" ["code-fixer" "executor"]
          // gsdAgents "gsd-review" ["code-reviewer" "plan-checker"]
          // gsdAgents "gsd-security" ["security-auditor"]
          // gsdAgents "gsd-light" [
            "codebase-mapper"
            "integration-checker"
            "nyquist-auditor"
            "pattern-mapper"
            "research-synthesizer"
            "ui-checker"
          ]
          // gsdAgents "gsd-standard" [
            "advisor-researcher"
            "ai-researcher"
            "assumptions-analyzer"
            "debug-session-manager"
            "doc-classifier"
            "doc-synthesizer"
            "doc-verifier"
            "doc-writer"
            "dom-verifier"
            "domain-researcher"
            "eval-auditor"
            "eval-planner"
            "framework-selector"
            "intel-updater"
            "mempalace-curator"
            "roadmapper"
            "ui-auditor"
            "ui-researcher"
            "user-profiler"
          ];
      };

      mcp.startupTimeoutMs = 15000;
      startup.quiet = true;
      theme.dark = "dark-catppuccin";
      statusLine.preset = "default";
    };

    rules = ./_files/omp/rules;
    skills = ./_files/omp/skills;
    agents = ./_files/omp/agents;
  };

  home.activation.signPaseo = lib.mkIf pkgs.stdenv.hostPlatform.isDarwin (
    lib.hm.dag.entryAfter ["copyApps"] ''
      app="$HOME/Applications/Home Manager Apps/Paseo.app"
      if [[ -d "$app" ]]; then
        run /usr/bin/codesign --force --deep --sign - "$app"
      fi
    ''
  );
}
