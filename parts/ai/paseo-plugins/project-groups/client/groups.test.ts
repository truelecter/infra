import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assignProject,
  buildLayout,
  dissolveGroup,
  moveCollapsed,
  moveGroup,
  normalizeGroupPath,
  pickGroupStatus,
  placeProject,
  splitProjectName,
  suggestGroups,
  type LayoutEntry,
  type SidebarProject,
} from "./groups.ts";

const agentic = { key: "k-agentic", name: "agentic-stuff" };
const app = { key: "k-app", name: "shepherd-companion/app" };
const recorder = { key: "k-recorder", name: "call-recorder" };
const cdk = { key: "k-cdk", name: "cdk" };

function rows(layout: LayoutEntry[]): string[] {
  return layout.map((entry) => {
    const pad = "  ".repeat(entry.depth);
    const flags = `${entry.hidden ? " (hidden)" : ""}${entry.kind === "group" && entry.collapsed ? " [collapsed]" : ""}`;
    return entry.kind === "group"
      ? `${pad}# ${entry.name}${flags}`
      : `${pad}${entry.label}${flags}`;
  });
}

describe("normalizeGroupPath", () => {
  it("trims segments and drops empty ones", () => {
    assert.equal(normalizeGroupPath("  work / aws//infra/ "), "work/aws/infra");
    assert.equal(normalizeGroupPath(" / "), "");
  });
});

describe("splitProjectName", () => {
  it("splits on the last slash", () => {
    assert.deepEqual(splitProjectName("a/b/app"), { path: "a/b", leaf: "app" });
  });
  it("keeps names without a usable prefix whole", () => {
    assert.deepEqual(splitProjectName("app"), { path: "", leaf: "app" });
    assert.deepEqual(splitProjectName("/app"), { path: "", leaf: "/app" });
    assert.deepEqual(splitProjectName("app/"), { path: "", leaf: "app/" });
  });
});

describe("placeProject", () => {
  it("groups by the name's prefix and shows only the leaf", () => {
    assert.deepEqual(placeProject(app, {}), { path: "shepherd-companion", label: "app" });
  });
  it("prefers a manual assignment and then shows the full name", () => {
    assert.deepEqual(placeProject(app, { "k-app": "work" }), {
      path: "work",
      label: "shepherd-companion/app",
    });
  });
  it("treats an empty assignment as ungrouped", () => {
    assert.deepEqual(placeProject(app, { "k-app": "" }), {
      path: "",
      label: "shepherd-companion/app",
    });
  });
});

describe("buildLayout", () => {
  it("places a group at its first project and pulls the others up behind it", () => {
    const projects = [agentic, app, recorder, cdk];
    const layout = buildLayout(projects, { "k-cdk": "shepherd-companion" }, new Set());
    assert.deepEqual(rows(layout), [
      "agentic-stuff",
      "# shepherd-companion",
      "  app",
      "  cdk",
      "call-recorder",
    ]);
  });

  it("nests groups to any depth", () => {
    const projects: SidebarProject[] = [
      { key: "1", name: "work/aws/infra" },
      { key: "2", name: "solo" },
      { key: "3", name: "work/web" },
      { key: "4", name: "work/aws/api" },
    ];
    const layout = buildLayout(projects, {}, new Set());
    assert.deepEqual(rows(layout), ["# work", "  # aws", "    infra", "    api", "  web", "solo"]);
    const work = layout[0];
    assert.equal(work.kind, "group");
    assert.deepEqual(work.kind === "group" && work.projectKeys, ["1", "3", "4"]);
  });

  it("hides everything under a collapsed group", () => {
    const projects: SidebarProject[] = [
      { key: "1", name: "work/aws/infra" },
      { key: "3", name: "work/web" },
      { key: "2", name: "solo" },
    ];
    assert.deepEqual(rows(buildLayout(projects, {}, new Set(["work"]))), [
      "# work [collapsed]",
      "  # aws (hidden)",
      "    infra (hidden)",
      "  web (hidden)",
      "solo",
    ]);
  });

  it("returns plain projects when nothing is grouped", () => {
    assert.deepEqual(rows(buildLayout([agentic, recorder], {}, new Set())), [
      "agentic-stuff",
      "call-recorder",
    ]);
  });
});

describe("assignProject", () => {
  it("stores a manual path", () => {
    assert.deepEqual(assignProject({}, cdk, " shepherd-companion "), {
      "k-cdk": "shepherd-companion",
    });
  });
  it("drops the assignment when the name already says the same", () => {
    assert.deepEqual(assignProject({ "k-app": "work" }, app, "shepherd-companion"), {});
  });
  it("stores an empty path to pull a named project out of its group", () => {
    assert.deepEqual(assignProject({}, app, ""), { "k-app": "" });
  });
  it("stores nothing to ungroup a project without a prefix", () => {
    assert.deepEqual(assignProject({ "k-cdk": "x" }, cdk, ""), {});
  });
});

describe("moveGroup", () => {
  const projects: SidebarProject[] = [
    { key: "1", name: "work/aws/infra" },
    { key: "2", name: "api" },
    { key: "3", name: "other" },
  ];
  const assignments = { "2": "work/aws" };

  it("renames a group and its subgroups, overriding name-based placement", () => {
    assert.deepEqual(moveGroup(assignments, projects, "work", "job"), {
      "1": "job/aws",
      "2": "job/aws",
    });
  });

  it("dissolves one level into the parent", () => {
    assert.deepEqual(dissolveGroup(assignments, projects, "work/aws"), { "1": "work", "2": "work" });
  });

  it("dissolves a top-level group into no group", () => {
    assert.deepEqual(dissolveGroup(assignments, projects, "work"), { "1": "aws", "2": "aws" });
    assert.deepEqual(dissolveGroup({}, [{ key: "1", name: "work/infra" }], "work"), { "1": "" });
  });

  it("leaves projects outside the group alone", () => {
    assert.deepEqual(moveGroup({ "3": "workbench" }, projects, "work", "job")["3"], "workbench");
  });
});

describe("moveCollapsed", () => {
  it("follows renames and drops dissolved groups", () => {
    const collapsed = new Set(["work", "work/aws", "other"]);
    assert.deepEqual([...moveCollapsed(collapsed, "work", "job")].sort(), [
      "job",
      "job/aws",
      "other",
    ]);
    assert.deepEqual([...moveCollapsed(collapsed, "work", "")].sort(), ["aws", "other"]);
  });
});

describe("suggestGroups", () => {
  it("matches case-insensitively and skips the exact current value", () => {
    const paths = ["work", "work/aws", "shepherd-companion"];
    assert.deepEqual(suggestGroups(paths, "WO"), ["work", "work/aws"]);
    assert.deepEqual(suggestGroups(paths, "work"), ["work/aws"]);
    assert.deepEqual(suggestGroups(paths, ""), paths);
  });
});

describe("pickGroupStatus", () => {
  it("picks the most urgent status", () => {
    assert.equal(pickGroupStatus(["running", "needs_input", "done"]), "needs_input");
    assert.equal(pickGroupStatus(["attention", "running"]), "running");
    assert.equal(pickGroupStatus(["done"]), null);
  });
});
