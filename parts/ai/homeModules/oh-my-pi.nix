{
  config,
  lib,
  pkgs,
  ...
}: let
  inherit
    (lib)
    literalExpression
    mkEnableOption
    mkIf
    mkOption
    mkPackageOption
    types
    ;

  cfg = config.programs.oh-my-pi;

  yamlFormat = pkgs.formats.yaml {};
  jsonFormat = pkgs.formats.json {};

  # OMP's default agent directory; PI_CODING_AGENT_DIR / OMP_PROFILE move it at runtime.
  agentDir = ".omp/agent";
  configRootDir = ".omp";

  isPathLike = lib.hm.strings.isPathLike;

  # Store content referenced by a string: local paths get copied into the store.
  toStorePath = value: "${value}";

  fileEntry = content:
    if isPathLike content
    then {source = content;}
    else {text = content;};

  transformedMcpServers =
    if cfg.enableMcpIntegration && config.programs.mcp.enable
    then
      lib.mapAttrs (
        name: server:
          lib.hm.mcp.transformMcpServer {
            inherit server;
            extraTransforms = [
              lib.hm.mcp.addType
              (lib.hm.mcp.wrapEnvFilesCommand {inherit pkgs name;})
            ];
          }
      )
      config.programs.mcp.servers
    else {};

  mcpServers = transformedMcpServers // cfg.mcpServers;

  # Built from this flake's own sources, so the module doesn't depend on an overlay.
  settingsNotice =
    (import ../omp-extensions {
      inherit (pkgs) lib stdenvNoCC runCommand bun;
    }).nix-settings-notice;

  extensions =
    lib.optional (!cfg.mutableSettings && cfg.settingsNotice) settingsNotice
    ++ cfg.extensions;

  settings =
    cfg.settings
    // lib.optionalAttrs (extensions != []) {
      extensions = map toStorePath extensions ++ (cfg.settings.extensions or []);
    };

  # Mutable: a read-only overlay (`OMP_CONFIG_FILES`) on top of config.yml, which OMP keeps writing.
  # Immutable: config.yml itself is the read-only Home Manager link.
  settingsFile =
    if cfg.mutableSettings
    then "${agentDir}/nix-config.yml"
    else "${agentDir}/config.yml";
  configFiles =
    lib.optional (cfg.mutableSettings && settings != {}) "~/${settingsFile}"
    ++ cfg.extraConfigFiles;

  environment =
    lib.optionalAttrs (configFiles != []) {OMP_CONFIG_FILES = lib.concatStringsSep ":" configFiles;}
    // cfg.environment;

  # With a read-only config.yml, `omp config set` would fail on a lock in the Nix store; say why.
  configGuard = ''
    case "''${1-} ''${2-}" in
      "config set" | "config reset")
        echo "omp: ~/${settingsFile} is managed by Home Manager (programs.oh-my-pi.mutableSettings = false)." >&2
        echo "Set programs.oh-my-pi.settings.''${3:-<key>} instead." >&2
        exit 1
        ;;
    esac
  '';

  wrapperArgs =
    lib.optionals (cfg.extraPackages != []) ["--suffix" "PATH" ":" (lib.makeBinPath cfg.extraPackages)]
    ++ lib.optionals (!cfg.mutableSettings) ["--run" configGuard];

  packageWrapped =
    if cfg.package != null && wrapperArgs != []
    then
      pkgs.symlinkJoin {
        inherit (cfg.package) meta;
        name = "${lib.getName cfg.package}-wrapped-${lib.getVersion cfg.package}";
        paths = [cfg.package];
        preferLocalBuild = true;
        nativeBuildInputs = [pkgs.makeWrapper];
        postBuild = ''
          wrapProgram $out/bin/${cfg.package.meta.mainProgram or "omp"} ${lib.escapeShellArgs wrapperArgs}
        '';
      }
    else cfg.package;

  normalizeSkill = source:
    pkgs.runCommandLocal "oh-my-pi-skill" {} ''
      source=${lib.escapeShellArg (toString source)}
      if [[ -d "$source" ]]; then
        ln -s "$source" "$out"
      elif [[ -f "$source" ]]; then
        mkdir "$out"
        ln -s "$source" "$out/SKILL.md"
      else
        echo "oh-my-pi skill source must be a file or directory: $source" >&2
        exit 1
      fi
    '';

  # OMP's native hook loader skips symlinked files (`Dirent.isFile()`), so hooks are copied into
  # one store directory that is then linked as a whole.
  hookDirectory = type: hooks:
    if isPathLike hooks
    then hooks
    else
      pkgs.runCommandLocal "oh-my-pi-hooks-${type}" {} (
        ''
          mkdir -p "$out"
        ''
        + lib.concatStrings (lib.mapAttrsToList (
            name: content: let
              file =
                if isPathLike content
                then content
                else pkgs.writeText name content;
            in ''
              cp -L ${lib.escapeShellArg (toString file)} "$out"/${lib.escapeShellArg name}
            ''
          )
          hooks)
      );

  withDefaultExtension = ext: name:
    if lib.hasInfix "." name
    then name
    else "${name}.${ext}";

  # Attribute set of files, or one directory linked recursively.
  mkFileSet = {
    dir,
    value,
    fileName ? lib.id,
  }:
    if isPathLike value
    then {
      ${dir} = {
        source = value;
        recursive = true;
      };
    }
    else
      lib.mapAttrs' (
        name: content: lib.nameValuePair "${dir}/${fileName name}" (fileEntry content)
      )
      value;

  contextFileOption = file: description:
    mkOption {
      type = types.either types.lines types.path;
      default = "";
      description = ''
        ${description}

        Either inline content or a path to a file. Written to
        {file}`~/${agentDir}/${file}`.
      '';
    };

  fileSetOption = {
    what,
    dir,
    ext,
    example ? null,
    extraDescription ? "",
  }:
    mkOption {
      type = types.either (types.attrsOf (types.either types.lines types.path)) types.path;
      default = {};
      description = ''
        ${what} for oh-my-pi.

        Either an attribute set or a path to a directory. For an attribute set, the name is the
        file name (`.${ext}` is appended when it has no extension) and the value is inline content
        or a path to a file, written to {file}`~/${agentDir}/${dir}/<name>`. A directory is linked
        recursively to {file}`~/${agentDir}/${dir}/`.
        ${extraDescription}
      '';
      example = lib.mapNullable literalExpression example;
    };
in {
  options.programs.oh-my-pi = {
    enable = mkEnableOption "oh-my-pi (omp), the coding agent";

    package = mkPackageOption pkgs "omp" {nullable = true;};

    extraPackages = mkOption {
      type = types.listOf types.package;
      default = [];
      example = literalExpression "[ pkgs.ripgrep pkgs.fd ]";
      description = "Extra packages added to the `PATH` of oh-my-pi.";
    };

    settings = mkOption {
      inherit (yamlFormat) type;
      default = {};
      example = {
        modelRoles.default = "anthropic/claude-sonnet-4-5:high";
        tools.approvalMode = "write";
        startup.quiet = true;
      };
      description = ''
        OMP settings. Where they go depends on {option}`programs.oh-my-pi.mutableSettings`.

        Maps merge across settings layers; lists (such as `extensions`) are replaced by the
        higher layer. See <https://omp.sh/docs> for the available settings.
      '';
    };

    mutableSettings = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether OMP may keep changing its own settings.

        - `true`: {option}`programs.oh-my-pi.settings` goes to the read-only overlay
          {file}`~/${agentDir}/nix-config.yml`, loaded through `OMP_CONFIG_FILES` on top of
          {file}`~/${agentDir}/config.yml`. OMP keeps saving runtime changes (the settings UI,
          `/model`, `omp config set`) to that file, which this module leaves alone. Keys set here
          win over it, so changing them from within OMP has no effect.
        - `false`: {file}`~/${agentDir}/config.yml` itself is the read-only Home Manager link.
          OMP applies runtime changes in memory only; its save fails (OMP resolves the link and
          can't lock or replace the store file) and the change is gone when OMP exits. The
          `nix-settings-notice` extension (see {option}`programs.oh-my-pi.settingsNotice`) says
          so and prints the matching `programs.oh-my-pi.settings` line, and `omp config set` /
          `reset` stop with a pointer to this option. `startup.setupWizard` defaults to `false`,
          because the wizard could never record that it ran. Switching from `true` replaces an
          existing {file}`config.yml` (Home Manager backs it up if `backupFileExtension` is set).
      '';
    };

    settingsNotice = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to load the `nix-settings-notice` extension when
        {option}`programs.oh-my-pi.mutableSettings` is `false`. It warns whenever OMP changes a
        setting it can't save, with the Home Manager line that would keep it.
      '';
    };

    extraConfigFiles = mkOption {
      type = types.listOf types.str;
      default = [];
      example = ["~/work/omp-config.yml"];
      description = ''
        More settings overlays, loaded after {option}`programs.oh-my-pi.settings` (later files
        win). Absolute paths or `~/...`; relative paths resolve against OMP's working directory.

        Together with the settings overlay (in mutable mode) they form `OMP_CONFIG_FILES` in
        {option}`programs.oh-my-pi.environment`. Every listed file must exist: OMP refuses to
        start when an overlay is missing. An `OMP_CONFIG_FILES` set in
        {file}`~/${agentDir}/.env` or exported as `PI_CONFIG_FILES` replaces this list entirely,
        so such a value must name {file}`~/${agentDir}/nix-config.yml` itself in mutable mode.
      '';
    };

    extensions = mkOption {
      type = types.listOf (types.either types.package types.path);
      default = [];
      example = literalExpression "[ pkgs.omp-extensions.say ./my-extension.ts ]";
      description = ''
        Extensions, prepended to `extensions` in {option}`programs.oh-my-pi.settings`. OMP also
        stacks plugins registered with `omp plugin link`/`install` on top of this list.

        Each entry is an extension file or an extension package directory: its entry points come
        from `omp.extensions` in its {file}`package.json` or an {file}`index.ts`, and its
        {file}`agents/`, {file}`skills/`, {file}`commands/`, {file}`rules/`, {file}`prompts/`,
        {file}`hooks/`, {file}`tools/` and {file}`.mcp.json` are discovered as well.
      '';
    };

    environment = mkOption {
      type = types.attrsOf types.str;
      default = {};
      example = {OMP_BEDROCK_AWS_PROFILE = "bedrock";};
      description = ''
        Environment variables written to {file}`~/${configRootDir}/.env`, which OMP loads at start
        for variables that are not already set. {file}`~/${agentDir}/.env` stays unmanaged and wins
        over these, so keep secrets there. `OMP_CONFIG_FILES` is filled from the settings overlays
        unless set here.
      '';
    };

    models = mkOption {
      inherit (yamlFormat) type;
      default = {};
      example = {
        providers.ollama = {
          baseUrl = "http://localhost:11434/v1";
          api = "openai-completions";
          models = [{id = "qwen3:32b";}];
        };
      };
      description = "Custom providers and models written to {file}`~/${agentDir}/models.yml`.";
    };

    enableMcpIntegration = mkOption {
      type = types.bool;
      default = false;
      description = ''
        Whether to add the servers of {option}`programs.mcp.servers` to
        {option}`programs.oh-my-pi.mcpServers`. Servers defined there take precedence.
      '';
    };

    mcpServers = mkOption {
      type = types.attrsOf jsonFormat.type;
      default = {};
      example = {
        github = {
          type = "http";
          url = "https://api.githubcopilot.com/mcp/";
        };
        filesystem = {
          type = "stdio";
          command = "npx";
          args = ["-y" "@modelcontextprotocol/server-filesystem" "/tmp"];
        };
      };
      description = ''
        MCP servers written to {file}`~/${agentDir}/.mcp.json`. OMP reads that file next to
        {file}`~/${agentDir}/mcp.json`, which stays unmanaged for `/mcp` and local servers; a
        server of the same name in {file}`mcp.json` wins.
      '';
    };

    keybindings = mkOption {
      inherit (yamlFormat) type;
      default = {};
      example = {"app.editor.external" = "ctrl+g";};
      description = "Key bindings written to {file}`~/${agentDir}/keybindings.yml`.";
    };

    context = contextFileOption "AGENTS.md" "Global context for every session.";

    stickyRules = contextFileOption "RULES.md" ''
      Rules sent with every request, kept in full across long sessions and compaction (unlike
      {option}`programs.oh-my-pi.rules`, which OMP may load on demand).
    '';

    systemPrompt = contextFileOption "SYSTEM.md" "Replacement for OMP's system prompt.";

    systemPromptTemplate = contextFileOption "SYSTEM_TEMPLATE.md" ''
      System prompt template, rendered with OMP's template variables.
    '';

    appendSystemPrompt = contextFileOption "APPEND_SYSTEM.md" "Text appended to the system prompt.";

    personality = contextFileOption "PERSONALITY.md" ''
      Replacement for the personality block of the system prompt.
    '';

    agents = fileSetOption {
      what = "Subagents (Markdown with front matter: `name`, `description`, `model`, `thinking`, `tools`)";
      dir = "agents";
      ext = "md";
      example = ''
        {
          reviewer = '''
            ---
            name: reviewer
            description: Reviews diffs for bugs
            model: "@review"
            tools: read, grep
            ---

            You review code changes.
          ''';
          documentation = ./agents/documentation.md;
        }
      '';
    };

    commands = fileSetOption {
      what = "Custom slash commands";
      dir = "commands";
      ext = "md";
    };

    prompts = fileSetOption {
      what = "Prompt templates";
      dir = "prompts";
      ext = "md";
    };

    rules = fileSetOption {
      what = "Rules";
      dir = "rules";
      ext = "md";
      extraDescription = ''
        Front matter `alwaysApply: true` loads a rule into every session, `description` alone makes
        it available on demand, and `condition` (glob list) injects it when the agent touches a
        matching file.
      '';
      example = ''
        {
          markdown-style = '''
            ---
            description: Markdown style
            condition: ["**/*.md"]
            ---

            Do not hard-wrap prose.
          ''';
        }
      '';
    };

    tools = fileSetOption {
      what = "Custom tools (`.ts`, `.js`, `.sh`, `.py`, `.json`, `.md`)";
      dir = "tools";
      ext = "ts";
    };

    themes = mkOption {
      type = types.either (types.attrsOf (types.either jsonFormat.type types.path)) types.path;
      default = {};
      description = ''
        Custom themes, written to {file}`~/${agentDir}/themes/<name>.json` from an attribute set
        (JSON value or path to a file), or a directory linked recursively. Select one with
        `theme.dark` / `theme.light` in {option}`programs.oh-my-pi.settings`.
      '';
    };

    skills = mkOption {
      type = types.either (types.attrsOf (types.oneOf [types.lines types.path types.str])) types.path;
      default = {};
      description = ''
        Skills for oh-my-pi.

        Either an attribute set or a path to a directory of skill folders. For an attribute set,
        the name is the skill directory and the value is inline {file}`SKILL.md` content, a path
        to a {file}`SKILL.md` file, or a path to a skill directory (also a store path string, such
        as a folder inside a package source). Written to {file}`~/${agentDir}/skills/<name>/`.
      '';
      example = literalExpression ''
        {
          git-release = '''
            ---
            name: git-release
            description: Create consistent releases and changelogs
            ---

            Draft release notes from merged PRs.
          ''';
          data-analysis = ./skills/data-analysis;
        }
      '';
    };

    hooks = let
      hookOption = type:
        mkOption {
          type = types.either (types.attrsOf (types.either types.lines types.path)) types.path;
          default = {};
          description = ''
            ${type} tool hooks. Attribute names are file names (`<tool>.ts`, or `*.ts` for every
            tool). Collected into one directory linked to {file}`~/${agentDir}/hooks/${type}`,
            so the directory is fully managed once this is set.
          '';
        };
    in {
      pre = hookOption "pre";
      post = hookOption "post";
    };
  };

  config = mkIf cfg.enable {
    assertions =
      map (name: {
        assertion = let
          value = cfg.${name};
        in
          !lib.isPath value || lib.pathIsDirectory value;
        message = "`programs.oh-my-pi.${name}` must be a directory when set to a path";
      }) ["agents" "commands" "prompts" "rules" "tools" "themes" "skills"]
      ++ [
        {
          assertion = cfg.package != null || cfg.extraPackages == [];
          message = "`programs.oh-my-pi.extraPackages` needs `programs.oh-my-pi.package`";
        }
      ];

    home.packages = lib.optional (packageWrapped != null) packageWrapped;

    programs.oh-my-pi.settings.startup.setupWizard = mkIf (!cfg.mutableSettings) (lib.mkDefault false);

    home.file = lib.mkMerge [
      (lib.mapAttrs' (file: option: lib.nameValuePair "${agentDir}/${file}" (mkIf (cfg.${option} != "") (fileEntry cfg.${option}))) {
        "AGENTS.md" = "context";
        "RULES.md" = "stickyRules";
        "SYSTEM.md" = "systemPrompt";
        "SYSTEM_TEMPLATE.md" = "systemPromptTemplate";
        "APPEND_SYSTEM.md" = "appendSystemPrompt";
        "PERSONALITY.md" = "personality";
      })

      {
        "${agentDir}/models.yml" = mkIf (cfg.models != {}) {
          source = yamlFormat.generate "oh-my-pi-models.yml" cfg.models;
        };

        "${agentDir}/keybindings.yml" = mkIf (cfg.keybindings != {}) {
          source = yamlFormat.generate "oh-my-pi-keybindings.yml" cfg.keybindings;
        };

        "${configRootDir}/.env" = mkIf (environment != {}) {
          text = lib.concatStrings (lib.mapAttrsToList (name: value: "${name}=${builtins.toJSON value}\n") environment);
        };

        ${settingsFile} = mkIf (settings != {}) {
          source = yamlFormat.generate "oh-my-pi-config.yml" settings;
        };

        "${agentDir}/.mcp.json" = mkIf (mcpServers != {}) {
          source = jsonFormat.generate "oh-my-pi-mcp.json" {
            "$schema" = "https://raw.githubusercontent.com/can1357/oh-my-pi/main/packages/coding-agent/src/config/mcp-schema.json";
            inherit mcpServers;
          };
        };

        "${agentDir}/hooks/pre" = mkIf (cfg.hooks.pre != {}) {source = hookDirectory "pre" cfg.hooks.pre;};
        "${agentDir}/hooks/post" = mkIf (cfg.hooks.post != {}) {source = hookDirectory "post" cfg.hooks.post;};
      }

      (mkFileSet {
        dir = "${agentDir}/agents";
        value = cfg.agents;
        fileName = withDefaultExtension "md";
      })
      (mkFileSet {
        dir = "${agentDir}/commands";
        value = cfg.commands;
        fileName = withDefaultExtension "md";
      })
      (mkFileSet {
        dir = "${agentDir}/prompts";
        value = cfg.prompts;
        fileName = withDefaultExtension "md";
      })
      (mkFileSet {
        dir = "${agentDir}/rules";
        value = cfg.rules;
        fileName = withDefaultExtension "md";
      })
      (mkFileSet {
        dir = "${agentDir}/tools";
        value = cfg.tools;
        fileName = withDefaultExtension "ts";
      })

      (
        if isPathLike cfg.themes
        then {
          "${agentDir}/themes" = {
            source = cfg.themes;
            recursive = true;
          };
        }
        else
          lib.mapAttrs' (
            name: theme:
              lib.nameValuePair "${agentDir}/themes/${name}.json" (
                if isPathLike theme
                then {source = theme;}
                else {source = jsonFormat.generate "oh-my-pi-theme-${name}.json" theme;}
              )
          )
          cfg.themes
      )

      (
        if isPathLike cfg.skills
        then {
          "${agentDir}/skills" = {
            source = cfg.skills;
            recursive = true;
          };
        }
        else
          lib.mapAttrs' (
            name: content:
              if lib.isPath content && lib.pathIsDirectory content
              then
                lib.nameValuePair "${agentDir}/skills/${name}" {
                  source = content;
                  recursive = true;
                }
              else if isPathLike content && !lib.isPath content
              then
                lib.nameValuePair "${agentDir}/skills/${name}" {
                  source = normalizeSkill content;
                  recursive = true;
                }
              else lib.nameValuePair "${agentDir}/skills/${name}/SKILL.md" (fileEntry content)
          )
          cfg.skills
      )
    ];
  };
}
