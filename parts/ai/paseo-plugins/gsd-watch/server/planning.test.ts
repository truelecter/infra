import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { parseRoadmap, parseState, readProject, splitFrontmatter } from "./planning.ts";

describe("splitFrontmatter", () => {
  test("reads top-level scalars only and keeps the body", () => {
    const { fields, body } = splitFrontmatter('---\nstatus: executing\nstopped_at: "01-04 Task 1"\nprogress:\n  percent: 40\n---\n\nPhase: 1\n');
    assert.deepEqual(fields, { status: "executing", stopped_at: "01-04 Task 1" });
    assert.equal(body, "\nPhase: 1\n");
  });

  test("text without front matter is all body", () => {
    assert.deepEqual(splitFrontmatter("# Title\n---\n"), { fields: {}, body: "# Title\n---\n" });
  });
});

describe("parseState", () => {
  test("takes the current phase and plan from the prose, normalizing the number", () => {
    const state = parseState("---\nstatus: executing\nmilestone_name: Beta\ncurrent_phase: 03\n---\nPhase: 02.1 (Hotfix) - EXECUTING\nPlan: 4 of 8\n");
    assert.equal(state.activePhase, "2.1");
    assert.equal(state.activePlan, 4);
    assert.equal(state.milestone, "Beta");
  });

  test("falls back to current_phase when the prose has no Phase line", () => {
    assert.equal(parseState("---\ncurrent_phase: 03\n---\n").activePhase, "3");
  });
});

describe("parseRoadmap", () => {
  const roadmap = parseRoadmap(
    [
      "- [x] **Phase 1: Foundation** - first",
      "- [ ] **Phase 2: Polish** - second",
      "### Phase 1: Foundation",
      "- [x] 01-01-PLAN.md \u2014 Walking skeleton (wave 1)",
      "- [ ] 01-02-PLAN.md \u2014 Gate run (wave 3; Xiaomi cells later)",
      "### Phase 2: **Polish**",
      "## Phase 10: Later",
    ].join("\n"),
  );

  test("names phases from headings and ticks from the checklist", () => {
    assert.deepEqual([...roadmap.names], [["1", "Foundation"], ["2", "Polish"], ["10", "Later"]]);
    assert.deepEqual([...roadmap.completedPhases], ["1"]);
  });

  test("titles plans without the wave suffix", () => {
    assert.deepEqual(roadmap.plans.get("1-1"), { title: "Walking skeleton", done: true });
    assert.deepEqual(roadmap.plans.get("1-2"), { title: "Gate run", done: false });
  });
});

describe("readProject", () => {
  let root: string;
  const put = async (path: string, content: string) => {
    const file = join(root, ".planning", path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
  };

  before(async () => {
    root = await mkdtemp(join(tmpdir(), "gsd-watch-"));
    await put("PROJECT.md", "# Call Recorder\n");
    await put("STATE.md", "---\nstatus: executing\nstopped_at: 02-02 checkpoint\n---\nPhase: 02 (Polish)\nPlan: 2 of 3\n");
    await put(
      "ROADMAP.md",
      "## Phase 1: Foundation\n## Phase 2: Polish\n- [ ] 02-01-PLAN.md \u2014 Theme (wave 1)\n## Phase 2.1: Hotfix\n## Phase 10: Later\n",
    );
    await put("state.json", JSON.stringify({ next: { command: "/gsd-execute-phase 2", label: "Execute", reason: "Phase 2 of 4" } }));
    await put("config.json", JSON.stringify({ model_profile: "balanced" }));
    await put("phases/01-foundation/01-CONTEXT.md", "");
    await put("phases/01-foundation/01-01-PLAN.md", "---\nwave: 1\n---\n<objective>\n## Goal\n\nBuild the skeleton. Then more.\n</objective>\n");
    await put("phases/01-foundation/01-01-SUMMARY.md", "");
    await put("phases/01-foundation/01-VERIFICATION.md", "");
    await put("phases/02-polish/02-01-PLAN.md", "---\nwave: 1\n---\n");
    await put("phases/02-polish/02-01-SUMMARY.md", "");
    await put("phases/02-polish/02-02-PLAN.md", "---\nwave: 2\n---\n");
    await put("phases/02-polish/02-03-PLAN.md", "---\nstatus: in_progress\n---\n");
    await put("phases/02-polish/02-HUMAN-UAT.md", "");
    await put("phases/02.1-hotfix/02.1-01-PLAN.md", "");
    await put("quick/260325-398-fix-title-color/260325-398-PLAN.md", "<objective>\nKeep the phase title white.\n</objective>\n");
    await put("quick/260325-398-fix-title-color/260325-398-SUMMARY.md", "");
    await put("quick/260328-on8-show-quick-tasks/260328-on8-PLAN.md", "no objective\n");
    await put("milestones/v1.2-phases/12-a/x.md", "");
    await put("milestones/v1.10-phases/13-a/x.md", "");
    await put("milestones/v1.10-phases/14-b/x.md", "");
    await put("MILESTONES.md", "## v1.10 Themes (Shipped: 2026-03-28)\n## v1.2 Config\n");
  });

  after(() => rm(root, { recursive: true, force: true }));

  test("orders phases by number, folders and roadmap-only phases alike", async () => {
    const project = await readProject(root);
    assert.deepEqual(
      project.phases.map((phase) => [phase.number, phase.name, phase.directory]),
      [
        ["1", "Foundation", "01-foundation"],
        ["2", "Polish", "02-polish"],
        ["2.1", "Hotfix", "02.1-hotfix"],
        ["10", "Later", null],
      ],
    );
  });

  test("derives status from summaries and STATE.md's current plan", async () => {
    const [foundation, polish, hotfix, later] = (await readProject(root)).phases;
    assert.equal(foundation.status, "complete");
    assert.equal(polish.status, "in_progress");
    assert.equal(polish.active, true);
    assert.deepEqual(
      polish.plans.map((plan) => [plan.id, plan.status, plan.active, plan.wave]),
      [
        ["02-01", "complete", false, 1],
        ["02-02", "pending", true, 2],
        ["02-03", "in_progress", false, null],
      ],
    );
    assert.equal(hotfix.status, "pending");
    assert.equal(later.status, "pending");
  });

  test("titles plans from the roadmap, then the objective, then the file name", async () => {
    const [foundation, polish] = (await readProject(root)).phases;
    assert.equal(foundation.plans[0].title, "Build the skeleton.");
    assert.equal(polish.plans[0].title, "Theme");
    assert.equal(polish.plans[1].title, "02-02-PLAN");
  });

  test("lists lifecycle badges in GSD's order", async () => {
    const [foundation, polish, hotfix] = (await readProject(root)).phases;
    assert.deepEqual(foundation.badges, ["discussed", "planned", "executed", "verified"]);
    assert.deepEqual(polish.badges, ["planned", "executed", "uat"]);
    assert.deepEqual(hotfix.badges, ["planned"]);
  });

  test("reads the header, quick tasks newest first, and milestones by version", async () => {
    const project = await readProject(root);
    assert.equal(project.name, "Call Recorder");
    assert.equal(project.status, "executing");
    assert.equal(project.stoppedAt, "02-02 checkpoint");
    assert.equal(project.modelProfile, "balanced");
    assert.deepEqual(project.next, { command: "/gsd-execute-phase 2", label: "Execute", reason: "Phase 2 of 4" });
    assert.deepEqual(
      project.quickTasks.map((task) => [task.date, task.title, task.status]),
      [
        ["2026-03-28", "show quick tasks", "in_progress"],
        ["2026-03-25", "Keep the phase title white.", "complete"],
      ],
    );
    assert.deepEqual(project.milestones, [
      { version: "v1.10", phaseCount: 2, shipped: "2026-03-28" },
      { version: "v1.2", phaseCount: 1, shipped: null },
    ]);
  });

  test("an empty .planning folder reads as a project without phases", async () => {
    const empty = await mkdtemp(join(tmpdir(), "gsd-watch-empty-"));
    try {
      await mkdir(join(empty, ".planning"));
      const project = await readProject(empty);
      assert.equal(project.name, empty.split("/").at(-1));
      assert.deepEqual([project.phases, project.quickTasks, project.milestones, project.next], [[], [], [], null]);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  });
});
