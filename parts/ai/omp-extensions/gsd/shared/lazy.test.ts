import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agentNames,
  countMentions,
  findPlanningDir,
  frontMatterName,
  skillsReloaded,
  visibleSkills,
  waitFor,
  withAdded,
} from "./lazy.ts";

function fakeFs(dirs: string[], files: string[] = []) {
  return {
    isDirectory: (path: string) => dirs.includes(path),
    exists: (path: string) => dirs.includes(path) || files.includes(path),
  };
}

test("finds .planning in cwd or a parent up to the git root", () => {
  const fs = fakeFs(["/r/.git", "/r/.planning"]);
  assert.equal(findPlanningDir("/r", fs), "/r/.planning");
  assert.equal(findPlanningDir("/r/a/b", fs), "/r/.planning");
});

test("stops at the git root, also for a worktree .git file", () => {
  assert.equal(
    findPlanningDir("/r/sub/x", fakeFs(["/r/sub/.git", "/r/.planning"])),
    undefined,
  );
  assert.equal(
    findPlanningDir("/r/sub", fakeFs(["/r/.planning"], ["/r/sub/.git"])),
    undefined,
  );
});

test("without git walks up to the filesystem root", () => {
  assert.equal(findPlanningDir("/a/b/c", fakeFs(["/.planning"])), "/.planning");
  assert.equal(findPlanningDir("/a/b/c", fakeFs([])), undefined);
});

test("a .planning file does not count", () => {
  assert.equal(
    findPlanningDir("/r", fakeFs(["/r/.git"], ["/r/.planning"])),
    undefined,
  );
});

test("reads name from front matter only", () => {
  assert.equal(
    frontMatterName("---\nname: gsd-planner\ndescription: x\n---\nbody"),
    "gsd-planner",
  );
  assert.equal(frontMatterName('---\nname: "gsd-x"\n---\n'), "gsd-x");
  assert.equal(
    frontMatterName("---\ndescription: x\n---\nname: late\n"),
    undefined,
  );
  assert.equal(frontMatterName("name: no-front-matter"), undefined);
});

test("agent names: front matter, file name fallback, compact twins merged", () => {
  assert.deepEqual(
    agentNames([
      { file: "gsd-b.md", content: "---\nname: gsd-b\n---\n" },
      { file: "gsd-b.compact.md", content: "---\nname: gsd-b\n---\n" },
      { file: "gsd-a.compact.md", content: "no front matter" },
      { file: "README.txt", content: "" },
    ]),
    ["gsd-a", "gsd-b"],
  );
});

test("withAdded keeps order and skips duplicates", () => {
  assert.deepEqual(withAdded(["x", "gsd-*"], ["gsd-*", "y"]), [
    "x",
    "gsd-*",
    "y",
  ]);
  assert.deepEqual(withAdded([], ["a"]), ["a"]);
});

test("visibleSkills drops the user's own ignores", () => {
  const glob = (pattern: string, name: string) =>
    new RegExp(
      `^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`,
    ).test(name);
  assert.deepEqual(
    visibleSkills(
      ["gsd-help", "gsd-ns-a", "gsd-update"],
      ["gsd-ns-*", "gsd-update"],
      glob,
    ),
    ["gsd-help"],
  );
});

test("countMentions counts whole names only", () => {
  assert.equal(
    countMentions("- gsd-phase: x\n- gsd-phase-researcher: y", ["gsd-phase"]),
    1,
  );
  assert.equal(
    countMentions("gsd-help, gsd-help and gsd-quick.", [
      "gsd-help",
      "gsd-quick",
    ]),
    3,
  );
  assert.equal(countMentions("nothing", ["gsd-help"]), 0);
});

test("skillsReloaded waits for active skills, then for the prompt when it lists skills", () => {
  const baseline = {
    expected: ["gsd-help"],
    promptMentions: 1,
    promptListsSkills: true,
  };
  assert.equal(
    skillsReloaded(baseline, ["backlog"], "gsd-help gsd-help"),
    false,
  );
  assert.equal(
    skillsReloaded(baseline, ["backlog", "gsd-help"], "mentions gsd-help once"),
    false,
  );
  assert.equal(
    skillsReloaded(baseline, ["gsd-help"], "gsd-help\n- gsd-help: Use when"),
    true,
  );
  assert.equal(
    skillsReloaded({ ...baseline, promptListsSkills: false }, ["gsd-help"], ""),
    true,
  );
  assert.equal(
    skillsReloaded(
      { expected: [], promptMentions: 0, promptListsSkills: true },
      [],
      "",
    ),
    true,
  );
});

test("waitFor polls until done or timeout", async () => {
  let clock = 0;
  const sleep = async (ms: number) => {
    clock += ms;
  };
  let calls = 0;
  assert.equal(
    await waitFor(
      () => ++calls === 3,
      1000,
      10,
      () => clock,
      sleep,
    ),
    true,
  );
  assert.equal(clock, 20);
  clock = 0;
  assert.equal(
    await waitFor(
      () => false,
      50,
      10,
      () => clock,
      sleep,
    ),
    false,
  );
  assert.equal(clock, 50);
});
