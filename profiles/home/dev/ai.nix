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

      # checkpoint/rewind let the agent drop exploration it no longer needs from its context.
      checkpoint.enabled = true;
      # Structural search next to ast_edit (on by default).
      astGrep.enabled = true;
      # Diagnostics after edits too, not only after whole-file writes.
      lsp.diagnosticsOnEdit = true;
      # Idle recaps only show in the terminal UI; agents mostly run in Paseo.
      recap.enabled = false;
      # Auto QA reports (xd://report_issue) go nowhere without consent, and with it they would send
      # local paths and internal URLs out; either way agents spend turns writing them.
      dev.autoqa = false;

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

  # Paseo daemon settings merged into ~/.paseo/config.json, and its plugins (parts/ai/paseo-plugins).
  # `daemon.hostnames` is left to the tailscale-listener plugin, which writes it. The model for
  # title generation (`agents.metadataGeneration`) is per user, next to the user's OMP models.
  programs.paseo = {
    enable = true;

    settings = {
      daemon = {
        listen = "127.0.0.1:6767";
        mcp.injectIntoAgents = true;
        browserTools.enabled = true;
        enableTerminalAgentHooks = true;
        appendSystemPrompt = "When the conversation's focus moves away from what your agent title describes, call the Paseo `update_agent` tool on yourself with a new title of at most 60 characters describing the current work. Don't retitle for small detours.";
        terminalProfiles = [
          {
            id = "profile_mum3f4d9_qfk51hlr8v";
            name = "omp";
            command = "omp";
            args = ["{{{prompt}}}"];
          }
        ];
        cors.allowedOrigins = ["https://app.paseo.sh"];
        relay.enabled = false;
      };
      app.baseUrl = "https://app.paseo.sh";
      pluginsEnabled = true;
      agents = {
        providers = {
          cursor = {
            extends = "acp";
            label = "Cursor";
            description = "Cursor's coding agent";
            command = ["cursor-agent" "acp"];
            env = {};
            enabled = false;
          };
          claude.enabled = false;
          codex.enabled = false;
          copilot.enabled = false;
          pi.enabled = false;
          omp.enabled = true;
          opencode.enabled = false;
        };
        skills.selection = {
          mode = "custom";
          skills = ["paseo" "paseo-help" "paseo-plugin"];
        };
      };
    };

    plugins = {
      backlog = {};
      beautiful-chat = {};
      catppuccin-mocha = {};
      gsd-watch = {};
      header-tab-name = {};
      project-groups = {};
      # macOS only: it samples top, vm_stat, and lsof (the package doesn't exist on Linux).
      system-health = lib.mkIf pkgs.stdenv.hostPlatform.isDarwin {};
      tailscale-listener = {};
      todowrite2-tasks.enabled = false;
      wide-chat = {};
      workspace-title-sync = {};
    };
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
