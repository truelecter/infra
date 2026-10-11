import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { runTool } from "./exec.ts";
import { localDate } from "./periods.ts";

export interface CostRow {
  /** Cost Explorer day, YYYY-MM-DD. */
  date: string;
  /** Bedrock usage type, for example `USE1-anthropic.claude-opus-5-5-mantle-output-tokens-global-standard`. */
  usageType: string;
  cost: number;
  /** Tokens the row bills, from Cost Explorer's usage quantity; null for a unit other than 1K or 1M tokens. */
  tokens: number | null;
}

export interface CostData {
  profile: string;
  rows: CostRow[];
  fetchedAt: number;
}

export type CostState =
  | { status: "ok"; data: CostData }
  | { status: "loading" }
  | { status: "unavailable"; reason: string };

/** Cost Explorer refreshes a few times a day and charges per request. */
const MAX_AGE_MS = 60 * 60_000;
/** After a failure (expired login, no permission), wait this long before asking again. */
const RETRY_MS = 5 * 60_000;
const QUERY_TIMEOUT_MS = 60_000;
/** Claude and the other Bedrock models are billed under these service names. */
const SERVICES = ["Amazon Bedrock Service", "Amazon Bedrock"];

/**
 * The profile OMP signs its Bedrock calls with: `OMP_BEDROCK_AWS_PROFILE` from the daemon's
 * environment, else from `~/.omp/agent/.env`, where the OMP `aws-profile` extension reads it.
 */
export function resolveProfile(): string | null {
  const fromEnv = process.env.OMP_BEDROCK_AWS_PROFILE?.trim();
  if (fromEnv) return fromEnv;
  try {
    const text = readFileSync(join(homedir(), ".omp", "agent", ".env"), "utf8");
    const match = /^\s*OMP_BEDROCK_AWS_PROFILE\s*=\s*["']?([^"'\s#]+)/m.exec(
      text,
    );
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/** The days every range needs: from the earlier of the 1st of the month and 29 days ago. */
export function costWindow(now: Date): { start: string; end: string } {
  const thirty = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 29,
  );
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  return {
    start: localDate(Math.min(thirty.getTime(), month.getTime())),
    end: localDate(tomorrow.getTime()),
  };
}

interface CostResponse {
  ResultsByTime?: {
    TimePeriod: { Start: string };
    Groups?: {
      Keys: string[];
      Metrics: {
        UnblendedCost: { Amount: string };
        UsageQuantity: { Amount: string; Unit: string };
      };
    }[];
  }[];
  NextPageToken?: string;
}

async function queryCosts(profile: string, now: Date): Promise<CostRow[]> {
  const { start, end } = costWindow(now);
  // A profile only applies when no static keys are in the environment.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    AWS_PROFILE: profile,
    AWS_PAGER: "",
  };
  delete env.AWS_ACCESS_KEY_ID;
  delete env.AWS_SECRET_ACCESS_KEY;
  delete env.AWS_SESSION_TOKEN;
  const rows: CostRow[] = [];
  let token: string | undefined;
  do {
    const result = await runTool(
      "aws",
      "AWS_BIN",
      [
        "ce",
        "get-cost-and-usage",
        "--time-period",
        `Start=${start},End=${end}`,
        "--granularity",
        "DAILY",
        "--metrics",
        "UnblendedCost",
        "UsageQuantity",
        "--filter",
        JSON.stringify({ Dimensions: { Key: "SERVICE", Values: SERVICES } }),
        "--group-by",
        "Type=DIMENSION,Key=USAGE_TYPE",
        "--output",
        "json",
        ...(token ? ["--next-page-token", token] : []),
      ],
      { timeoutMs: QUERY_TIMEOUT_MS, env },
    );
    if (!result.ok) throw new Error(result.problem);
    const page = JSON.parse(result.stdout) as CostResponse;
    for (const period of page.ResultsByTime ?? []) {
      for (const group of period.Groups ?? []) {
        const cost = Number(group.Metrics.UnblendedCost.Amount);
        const quantity = Number(group.Metrics.UsageQuantity.Amount);
        if (cost === 0 && quantity === 0) continue;
        // Units seen: "1K tokens", "1K Tokens", "1M tokens".
        const unit = /^1([KM]) tokens$/i.exec(
          group.Metrics.UsageQuantity.Unit.trim(),
        );
        const tokens = unit
          ? quantity * (unit[1]!.toUpperCase() === "K" ? 1e3 : 1e6)
          : null;
        rows.push({
          date: period.TimePeriod.Start,
          usageType: group.Keys[0]!,
          cost,
          tokens,
        });
      }
    }
    token = page.NextPageToken;
  } while (token);
  return rows;
}

export interface CostExplorer {
  /** The cached answer, without asking AWS. */
  state(): CostState;
  /**
   * Refreshes when forced or older than an hour, and waits at most `waitMs` for the answer;
   * a slower answer lands in the cache for the next call.
   */
  fresh(options: { force?: boolean; waitMs: number }): Promise<CostState>;
}

/** One cached Cost Explorer result per plugin process, shared by the card and every screen. */
export function createCostExplorer(): CostExplorer {
  let data: CostData | null = null;
  let failure: { reason: string; at: number } | null = null;
  let inFlight: Promise<CostState> | null = null;

  const state = (): CostState => {
    if (data) return { status: "ok", data };
    if (failure && !inFlight)
      return { status: "unavailable", reason: failure.reason };
    return { status: "loading" };
  };

  const refresh = (): Promise<CostState> => {
    inFlight ??= (async () => {
      const profile = resolveProfile();
      if (!profile) {
        failure = { reason: "no OMP_BEDROCK_AWS_PROFILE", at: Date.now() };
        return state();
      }
      try {
        data = {
          profile,
          rows: await queryCosts(profile, new Date()),
          fetchedAt: Date.now(),
        };
        failure = null;
      } catch (error) {
        failure = {
          reason: error instanceof Error ? error.message : String(error),
          at: Date.now(),
        };
        console.warn(`Cost Explorer: ${failure.reason}`);
      }
      return state();
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  return {
    state,
    async fresh(options: {
      force?: boolean;
      waitMs: number;
    }): Promise<CostState> {
      const now = Date.now();
      const stale = !data || now - data.fetchedAt > MAX_AGE_MS;
      const mayRetry = !failure || now - failure.at > RETRY_MS;
      if (!options.force && !(stale && mayRetry)) return state();
      const pending = refresh();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const waited = new Promise<CostState>((resolve) => {
        timer = setTimeout(() => resolve(state()), options.waitMs);
      });
      return Promise.race([pending, waited]).finally(() => clearTimeout(timer));
    },
  };
}
