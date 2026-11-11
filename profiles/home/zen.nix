{
  lib,
  pkgs,
  flake,
  ...
}: let
  inherit (pkgs.stdenv.hostPlatform) isDarwin system;
in {
  # profiles.ini is read-only, so Zen must not pick a per-install profile (HM firefox docs).
  launchd.agents.zen-legacy-profiles = lib.mkIf isDarwin {
    enable = true;
    config = {
      ProgramArguments = ["/bin/launchctl" "setenv" "MOZ_LEGACY_PROFILES" "1"];
      RunAtLoad = true;
    };
  };

  programs.zen-browser = {
    enable = true;

    # Rename the app on Darwin to not contain Beta
    unwrappedPackage = lib.mkIf isDarwin (
      flake.inputs.zen-browser.packages.${system}.beta-unwrapped.override {applicationName = "Zen";}
    );

    policies = {
      ExtensionSettings = let
        amo = slug: {
          install_url = "https://addons.mozilla.org/firefox/downloads/latest/${slug}/latest.xpi";
          installation_mode = "force_installed";
        };
      in
        # Add-on ID (from its manifest) = addons.mozilla.org slug.
        builtins.mapAttrs (_: amo) {
          "{d634138d-c276-4fc8-924b-40a0ea21d284}" = "1password-x-password-manager";
          "uBlock0@raymondhill.net" = "ublock-origin";
          "addon@darkreader.org" = "darkreader";
          "{3c6bf0cc-3ae2-42fb-9993-0d33104fdcaf}" = "youtube-addon";
          "disable-html5-autoplay@afnankhan" = "disable-autoplay";
          "medium-parser@example.com" = "medium-parser";
          "cors-everywhere@spenibus" = "cors-everywhere";
          "{d3e01ff2-9a3a-4007-8f6e-7acd9a5de263}" = "saml-tracer";
          "{a81256d7-babd-4185-91f6-95580215661d}" = "postman_interceptor";
        };
    };

    profiles.default = {
      id = 0;
      isDefault = true;

      # Zen replaces the symlink on every launch.
      containersForce = true;
      containers = {
        Personal = {
          id = 1;
          icon = "fingerprint";
          color = "blue";
        };
        Work = {
          id = 2;
          icon = "briefcase";
          color = "orange";
        };
        Banking = {
          id = 3;
          icon = "dollar";
          color = "green";
        };
        Shopping = {
          id = 4;
          icon = "cart";
          color = "pink";
        };
      };

      # RapidFox Ultra (github.com/Eratas/rapidfox), minus privacy-weakening and Windows-only prefs.
      settings = {
        "browser.preferences.defaultPerformanceSettings.enabled" = false;

        # Network
        "network.http.max-connections" = 1800;
        "network.http.max-persistent-connections-per-server" = 8;
        "network.http.max-urgent-start-excessive-connections-per-host" = 5;
        "network.http.request.max-start-delay" = 5;
        "network.http.pacing.requests.enabled" = false;
        "network.http.pacing.requests.burst" = 32;
        "network.http.pacing.requests.min-parallelism" = 10;
        "network.dnsCacheExpiration" = 600;
        "network.dnsCacheExpirationGracePeriod" = 120;
        "network.dnsCacheEntries" = 10000;
        "network.ssl_tokens_cache_capacity" = 32768;
        "network.http.speculative-parallel-limit" = 0;
        "network.dns.disablePrefetch" = true;
        "network.dns.disablePrefetchFromHTTPS" = true;
        "network.prefetch-next" = false;
        "network.predictor.enabled" = false;
        "network.predictor.enable-prefetch" = false;
        "browser.urlbar.speculativeConnect.enabled" = false;
        "browser.places.speculativeConnect.enabled" = false;

        # Memory and caching: memory cache only, no disk cache
        "javascript.options.mem.high_water_mark" = 128;
        "browser.cache.disk.enable" = false;
        "browser.cache.disk.capacity" = 0;
        "browser.cache.memory.capacity" = 131072;
        "browser.cache.disk.smart_size.enabled" = false;
        "browser.cache.memory.max_entry_size" = 32768;
        "browser.cache.disk.metadata_memory_limit" = 16384;
        "browser.cache.max_shutdown_io_lag" = 100;
        "image.mem.max_decoded_image_kb" = 512000;
        "image.cache.size" = 10485760;
        "image.mem.decode_bytes_at_a_time" = 65536;
        "image.mem.shared.unmap.min_expiration_ms" = 90000;
        "media.memory_cache_max_size" = 1048576;
        "media.memory_caches_combined_limit_kb" = 4194304;
        "media.cache_readahead_limit" = 600;
        "media.cache_resume_threshold" = 300;
        "dom.storage.default_quota" = 20480;
        "dom.storage.shadow_writes" = true;
        "browser.sessionstore.interval" = 60000;
        "browser.sessionhistory.max_total_viewers" = 10;
        "browser.sessionstore.max_tabs_undo" = 10;
        "browser.sessionstore.max_entries" = 10;
        "browser.tabs.min_inactive_duration_before_unload" = 600000;

        # JavaScript and content
        "content.maxtextrun" = 8191;
        "content.interrupt.parsing" = true;
        "content.notify.ontimer" = true;
        "content.notify.interval" = 50000;
        "content.max.tokenizing.time" = 2000000;
        "content.switch.threshold" = 300000;
        "layout.frame_rate" = -1;
        "nglayout.initialpaint.delay" = 5;
        "gfx.content.skia-font-cache-size" = 32;

        # GPU and rendering
        "gfx.webrender.all" = true;
        "gfx.webrender.enabled" = true;
        "gfx.webrender.compositor" = true;
        "gfx.webrender.precache-shaders" = true;
        "gfx.webrender.software" = false;
        "gfx.canvas.accelerated.cache-items" = 32768;
        "gfx.canvas.accelerated.cache-size" = 4096;
        "gfx.canvas.max-size" = 16384;
        "webgl.max-size" = 16384;
        "dom.webgpu.enabled" = true;

        # UI responsiveness
        "ui.submenuDelay" = 0;
        "dom.element.animate.enabled" = true;
        "general.smoothScroll" = true;
        "general.smoothScroll.msdPhysics.enabled" = false;
        "general.smoothScroll.currentVelocityWeighting" = 0;
        "apz.overscroll.enabled" = false;
        "general.smoothScroll.stopDecelerationWeighting" = 1;
        "general.smoothScroll.mouseWheel.durationMaxMS" = 150;
        "general.smoothScroll.mouseWheel.durationMinMS" = 50;
        "mousewheel.min_line_scroll_amount" = 15;
        "mousewheel.scroll_series_timeout" = 10;

        # Processes and tabs
        "dom.ipc.processCount" = 8;
        "dom.ipc.keepProcessesAlive.web" = 4;
        "dom.ipc.processPriorityManager.backgroundUsesEcoQoS" = false;
        "accessibility.force_disabled" = 1;

        # Media
        "dom.media.webcodecs.h265.enabled" = true;
        "media.videocontrols.picture-in-picture.enable-when-switching-tabs.enabled" = true;
        "media.ffmpeg.vaapi.enabled" = true;

        "browser.safebrowsing.downloads.remote.enabled" = false;

        # Platform
        "widget.macos.titlebar-blend" = true;
        "widget.wayland.opaque-region.enabled" = true;
        "widget.wayland.fractional-scale.enabled" = true;

        # Zen
        "zen.workspaces.open-new-tab-if-last-unpinned-tab-is-closed" = true;
        "zen.workspaces.continue-where-left-off" = true;
        "reader.parse-on-load.enabled" = false;

        # AI and suggestions
        "browser.ml.chat.enabled" = false;
        "browser.search.suggest.enabled" = false;
        "browser.urlbar.suggest.searches" = false;
        "browser.findbar.suggest.enabled" = false;
      };
    };
  };
}
