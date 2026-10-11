# omp-usage

Paseo plugin for the cost and token use of OMP's Bedrock sessions. Paseo's own usage sources show subscription plan quotas and skip Bedrock sessions, so this spend is otherwise not shown anywhere in Paseo.

It adds two things:

- A "Bedrock (OMP)" card in Paseo's Usage (the gauge in the sidebar footer, or Settings, Usage): OMP's cost today, this week (since Monday 00:00 local time), and this month; this week's account-wide Bedrock cost and API-equivalent estimate, requests, output tokens, cache read and write tokens; this week's top four models and folders; the time of the newest request.
- An "OMP usage" screen, opened from the chart icon in the sidebar footer, with a range picker (today, this week, this month, 30 days): the three cost figures below, token totals with average time to first token and tokens per second, cost per day, and tables by model, folder, main agent or subagent, and tool.

## Where the numbers come from

The AWS account OMP uses for Bedrock also serves other services, so its bill is not OMP's cost. The plugin shows three figures:

- **OMP at account prices** (the main figure, and the card's bars): OMP's own token counts, per model and token kind (uncached input, output, cache read, cache write), times the average price this account paid for that model and kind. The prices come from Cost Explorer's cost and usage quantity over its whole window (the month and the last 30 days). Cache writes of 5 minutes and 1 hour share one price, because OMP doesn't record which kind a write was. Because OMP's token counts are live, this figure has no billing lag; only the prices are averages. A model or token kind the account has no price for falls back to OMP's API-equivalent estimate for its share of tokens, and is marked (`*` on the screen, a row on the card).
- **All Bedrock in the account**: Cost Explorer's total for the services `Amazon Bedrock Service` and `Amazon Bedrock`, every service in the account included. Cost Explorer lags up to a day, so today and yesterday are incomplete; the card and the screen say which day the data reaches. Days are Cost Explorer's (UTC), compared with local dates. Models in the bill that OMP didn't use show as rows with no requests.
- **API-equivalent**: OMP's own estimate, the `cost_total` OMP records for every request at the public per-token prices of its model catalog. It can be far above the other two when the account pays less than list prices.

Cost Explorer signs in with the profile OMP uses for Bedrock: `OMP_BEDROCK_AWS_PROFILE` from the daemon's environment, else from `~/.omp/agent/.env`. When it can't answer (no profile, expired login, no `ce:GetCostAndUsage` permission), the card and the screen show the API-equivalent estimate and a warning says why.

Model names are matched between OMP and the bill: OMP's `global.anthropic.claude-opus-5-5` and the usage type `USE1-anthropic.claude-opus-5-5-mantle-output-tokens-global-standard` are both `claude-opus-5-5`; the older `USE1-Claude4.5Haiku-...` types match `claude-haiku-4-5-20251001-v1:0`. Only OMP's Bedrock requests (provider `amazon-bedrock`) count on the OMP side.

How it runs:

- Token counts, folders, and tools come from OMP's `~/.omp/stats.db`, the database behind `omp stats`, read read-only with `node:sqlite`. OMP fills it only when `omp stats` runs, so each read first runs `omp stats --summary` (the path in `OMP_BIN` when set, else `omp` from `PATH`, then `/etc/profiles/per-user/<user>/bin/omp`; 12-second timeout), at most every 30 seconds. A failed sync still shows the last data, with a warning.
- One Cost Explorer query covers the month and the last 30 days. Its answer is cached in the plugin process for an hour (after a failure, five minutes); Cost Explorer charges $0.01 per request. The screen's Refresh asks again right away. The plugin asks once when it starts, so the first card already has AWS numbers; the card waits at most 4 seconds for Cost Explorer, the screen 20, then shows what it has and the screen asks again every 5 seconds until the answer is in.
- The `aws` CLI is the path in `AWS_BIN` when set, else `aws` from `PATH`, then `/etc/profiles/per-user/<user>/bin/aws`. Static AWS keys in the daemon's environment are removed for the query, so the profile applies. If the profile's `credential_process` needs a fresh login, the query fails until OMP or you log in again.
- Paseo caches the card for five minutes; the Usage refresh button fetches again.
- Sessions removed from `~/.omp/agent/sessions` before a sync are never counted.
- The card has no percentage window (Bedrock has no quota), so nothing shows in the sidebar footer summary, only in the Usage modal.
- Without `~/.omp/stats.db` the card is left out and the screen shows zeros with a note; the end-to-end spec checks that state (its harness points `OMP_BIN` and `AWS_BIN` at missing files and empties `OMP_BEDROCK_AWS_PROFILE`).

## Develop

Installed through `programs.paseo.plugins.omp-usage` (the parts/ai/homeModules/paseo.nix Home Manager module). To work on it without a switch, run `paseo-plugin-dev link omp-usage` from your checkout: Paseo then loads this folder, `paseo plugin reload omp-usage` picks up each edit, and `paseo plugin logs omp-usage` shows its output. `paseo-plugin-dev restore omp-usage` goes back to the installed build. See `parts/ai/AGENTS.md`.

```sh
nix shell --inputs-from "$(git rev-parse --show-toplevel)" latest#bun \
  -c sh -c 'bun install --frozen-lockfile && bun run typecheck && bun run test'
rm -rf node_modules
nix build .#paseo-plugin-omp-usage -L
nix run .#paseo-plugins-e2e -- specs/omp-usage.spec.ts
```

Run `bun install` with the public registry (`--registry https://registry.npmjs.org/`) when a user-level `.npmrc` points elsewhere, so `bun.lock` keeps empty registry fields like the other plugins.

Requires Paseo 0.11 (`server.registerUsageSource`, `addScreen`, `addSidebarFooterItem`) and `pluginsEnabled: true` in the daemon's `config.json`.
