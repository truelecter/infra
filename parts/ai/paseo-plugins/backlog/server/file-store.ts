import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { backlogDataSchema, emptyData, type BacklogData } from "./store.ts";

/** Where the backlog lives. The `backlog` CLI resolves the same directory. */
export function backlogDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.PASEO_BACKLOG_DIR || join(homedir(), ".local", "share", "paseo-backlog");
}

/**
 * The backlog JSON file. This process is its only writer: the CLI goes through the HTTP socket,
 * and mutations run one at a time, so read-modify-write never loses an update.
 */
export class FileStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    readonly path: string,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async read(): Promise<BacklogData> {
    let text: string;
    try {
      text = await readFile(this.path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyData();
      throw error;
    }
    // A broken file stops every write instead of being replaced by an empty backlog.
    const parsed = backlogDataSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      throw new Error(`${this.path} is not a valid backlog file: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  mutate<Result>(
    change: (data: BacklogData, now: string) => { data: BacklogData; result: Result },
  ): Promise<Result> {
    const run = this.queue.then(async () => {
      const { data, result } = change(await this.read(), this.now());
      await mkdir(dirname(this.path), { recursive: true });
      const temporary = `${this.path}.${process.pid}.tmp`;
      await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
      await rename(temporary, this.path);
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}
