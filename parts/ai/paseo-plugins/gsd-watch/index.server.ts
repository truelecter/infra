import type { PluginServerContext } from "@getpaseo/plugin/server";
import { isAbsolute, join } from "node:path";
import { getProject, type ProjectResult } from "./shared/gsd.ts";
import { isDirectory, readProject } from "./server/planning.ts";

export default function contribute(server: PluginServerContext) {
  // Every open panel polls; panels on the same workspace (desktop and phone) share one read.
  const inFlight = new Map<string, Promise<ProjectResult>>();

  server.handle(getProject, ({ directory }) => {
    if (!isAbsolute(directory)) throw new Error(`Not an absolute path: ${directory}`);
    const planningDirectory = join(directory, ".planning");
    let read = inFlight.get(planningDirectory);
    if (!read) {
      read = (async (): Promise<ProjectResult> =>
        (await isDirectory(planningDirectory))
          ? { found: true, planningDirectory, project: await readProject(directory) }
          : { found: false, planningDirectory })().finally(() => inFlight.delete(planningDirectory));
      inFlight.set(planningDirectory, read);
    }
    return read;
  });

  return () => {};
}
