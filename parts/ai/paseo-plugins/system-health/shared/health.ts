import { defineRpc, defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

/** How often the screen takes a new sample on its own; 0 means only on open and on Refresh. */
export const REFRESH_CHOICES = [0, 5, 10, 30, 60] as const;

export const screenSettings = defineSettings({
  id: "screen",
  scope: "host",
  version: 1,
  schema: z.object({
    refreshSeconds: z
      .number()
      .int()
      .refine(
        (value) => (REFRESH_CHOICES as readonly number[]).includes(value),
        "Unsupported interval",
      )
      .default(0),
  }),
});

export const memorySchema = z.object({
  totalBytes: z.number(),
  freeBytes: z.number(),
  wiredBytes: z.number(),
  /** Physical memory the compressor occupies. */
  compressorBytes: z.number(),
  /** Memory stored in the compressor before compression. */
  compressedBytes: z.number(),
  /** Anonymous (app) pages. */
  appBytes: z.number(),
  /** File-backed pages: cached files that macOS can drop. */
  cachedBytes: z.number(),
  /** Whatever the other counters don't cover. */
  otherBytes: z.number(),
  swapUsedBytes: z.number(),
  swapTotalBytes: z.number(),
  pressure: z.enum(["normal", "warning", "critical", "unknown"]),
  /** Share of memory macOS considers available, `kern.memorystatus_level`. */
  availablePercent: z.number().nullable(),
  rates: z.object({
    pageinsPerSec: z.number(),
    swapinsPerSec: z.number(),
    swapoutsPerSec: z.number(),
    compressionsPerSec: z.number(),
    decompressionsPerSec: z.number(),
  }),
});
export type Memory = z.infer<typeof memorySchema>;

export const cpuSchema = z.object({
  userPercent: z.number(),
  sysPercent: z.number(),
  idlePercent: z.number(),
  load: z.tuple([z.number(), z.number(), z.number()]),
  cores: z.number(),
});
export type Cpu = z.infer<typeof cpuSchema>;

export const processSchema = z.object({
  pid: z.number(),
  name: z.string(),
  /** Physical footprint, compressed and swapped memory included (top's MEM). */
  memBytes: z.number(),
  compressedBytes: z.number(),
  cpuPercent: z.number(),
  ageSeconds: z.number(),
});
export type ProcessRow = z.infer<typeof processSchema>;

export const appSchema = z.object({
  /** App name, `Paseo agents` for agent sessions, or the executable name outside an app. */
  name: z.string(),
  kind: z.enum(["app", "agents", "process"]),
  /** The .app bundle, when the group is one. */
  bundlePath: z.string().nullable(),
  memBytes: z.number(),
  compressedBytes: z.number(),
  cpuPercent: z.number(),
  processCount: z.number(),
  /** Biggest processes first, at most PROCESSES_PER_APP. */
  processes: z.array(processSchema),
});
export type AppGroup = z.infer<typeof appSchema>;

export const sessionSchema = z.object({
  pid: z.number(),
  agentId: z.string().nullable(),
  title: z.string().nullable(),
  status: z.string().nullable(),
  archived: z.boolean(),
  cwd: z.string().nullable(),
  lastActivityAt: z.string().nullable(),
  ompVersion: z.string().nullable(),
  /** Runs an omp other than the installed one, for example after an upgrade. */
  outdated: z.boolean(),
  ageSeconds: z.number(),
  /** The session process and everything it started. */
  memBytes: z.number(),
  compressedBytes: z.number(),
  cpuPercent: z.number(),
  children: z.array(processSchema),
});
export type Session = z.infer<typeof sessionSchema>;

export const agentsSchema = z.object({
  sessions: z.array(sessionSchema),
  installedOmpVersion: z.string().nullable(),
  liveAgents: z.number(),
  archivedAgents: z.number(),
  /** Set when Paseo's agent list could not be read. */
  error: z.string().nullable(),
});
export type Agents = z.infer<typeof agentsSchema>;

export const outlierSchema = processSchema.extend({
  app: z.string(),
  /** Parent is launchd and the binary is outside an app bundle and the system folders. */
  detached: z.boolean(),
  /** Runs as the Paseo user and is not an agent session (archive those instead). */
  killable: z.boolean(),
});
export type Outlier = z.infer<typeof outlierSchema>;

export const snapshotSchema = z.object({
  sampledAt: z.string(),
  sampleSeconds: z.number(),
  memory: memorySchema,
  cpu: cpuSchema,
  apps: z.array(appSchema),
  /** Footprint of the apps beyond the listed ones. */
  otherAppsBytes: z.number(),
  otherAppsCount: z.number(),
  agents: agentsSchema,
  outliers: z.array(outlierSchema),
});
export type Snapshot = z.infer<typeof snapshotSchema>;

export const getSnapshot = defineRpc({
  name: "system-health.snapshot",
  input: z.object({}),
  output: snapshotSchema,
});

export const archiveAgent = defineRpc({
  name: "system-health.archive-agent",
  input: z.object({ agentId: z.string().min(1) }),
  output: z.object({ archivedAt: z.string() }),
});

export const quitApp = defineRpc({
  name: "system-health.quit-app",
  input: z.object({ bundlePath: z.string().min(1) }),
  output: z.object({}),
});

export const killProcess = defineRpc({
  name: "system-health.kill-process",
  /** `name` must still match the process, so a reused pid is left alone. */
  input: z.object({ pid: z.number().int(), name: z.string().min(1) }),
  output: z.object({}),
});
