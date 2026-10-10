// Pure grouping model: where each sidebar project goes, and how group edits rewrite assignments.
// No DOM here, so it runs under node --test.

export type Assignments = Readonly<Record<string, string>>;

export interface SidebarProject {
  /** Paseo's project view key, from `data-testid="sidebar-project-row-<key>"`. */
  key: string;
  /** Name as Paseo shows it, custom name included. */
  name: string;
}

export interface Placement {
  /** Group path, "" when the project is not grouped. */
  path: string;
  /** Name to show in the row. Drops the name's own prefix when that prefix is the group. */
  label: string;
}

export type LayoutEntry =
  | {
      kind: "group";
      path: string;
      name: string;
      depth: number;
      collapsed: boolean;
      /** An ancestor group is collapsed. */
      hidden: boolean;
      /** Every project in this group and its subgroups. */
      projectKeys: string[];
    }
  | {
      kind: "project";
      key: string;
      label: string;
      depth: number;
      hidden: boolean;
    };

export type StatusBucket = "needs_input" | "failed" | "running" | "attention";

const STATUS_PRIORITY: readonly StatusBucket[] = [
  "needs_input",
  "failed",
  "running",
  "attention",
];

export function normalizeGroupPath(input: string): string {
  return input
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

export function parentGroupPath(path: string): string {
  const index = path.lastIndexOf("/");
  return index < 0 ? "" : path.slice(0, index);
}

export function groupName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

/** `"work/aws/app"` -> `{ path: "work/aws", leaf: "app" }`. Names without a usable prefix stay whole. */
export function splitProjectName(name: string): { path: string; leaf: string } {
  const index = name.lastIndexOf("/");
  if (index < 0) return { path: "", leaf: name };
  const path = normalizeGroupPath(name.slice(0, index));
  const leaf = name.slice(index + 1).trim();
  if (!path || !leaf) return { path: "", leaf: name };
  return { path, leaf };
}

export function placeProject(
  project: SidebarProject,
  assignments: Assignments,
): Placement {
  const fromName = splitProjectName(project.name);
  const manual = Object.hasOwn(assignments, project.key)
    ? normalizeGroupPath(assignments[project.key])
    : undefined;
  const path = manual ?? fromName.path;
  const label =
    fromName.path && fromName.path === path ? fromName.leaf : project.name;
  return { path, label };
}

interface GroupNode {
  path: string;
  children: (GroupNode | ProjectLeaf)[];
  projectKeys: string[];
}

interface ProjectLeaf {
  key: string;
  label: string;
}

function isGroup(node: GroupNode | ProjectLeaf): node is GroupNode {
  return "children" in node;
}

/**
 * Sidebar rows in display order. A group sits where its first project (in Paseo's own order)
 * would be, and pulls the rest of its projects up behind it.
 */
export function buildLayout(
  projects: readonly SidebarProject[],
  assignments: Assignments,
  collapsed: ReadonlySet<string>,
): LayoutEntry[] {
  const root: GroupNode = { path: "", children: [], projectKeys: [] };
  const groups = new Map<string, GroupNode>();

  function ensure(path: string): GroupNode {
    if (!path) return root;
    const existing = groups.get(path);
    if (existing) return existing;
    const parent = ensure(parentGroupPath(path));
    const node: GroupNode = { path, children: [], projectKeys: [] };
    parent.children.push(node);
    groups.set(path, node);
    return node;
  }

  // Walking projects in order creates each group when its first project arrives, so every
  // children list is already in display order.
  for (const project of projects) {
    const { path, label } = placeProject(project, assignments);
    ensure(path).children.push({ key: project.key, label });
    for (let at = path; at; at = parentGroupPath(at))
      groups.get(at)?.projectKeys.push(project.key);
  }

  const entries: LayoutEntry[] = [];
  function walk(node: GroupNode, depth: number, hidden: boolean) {
    for (const child of node.children) {
      if (!isGroup(child)) {
        entries.push({
          kind: "project",
          key: child.key,
          label: child.label,
          depth,
          hidden,
        });
        continue;
      }
      const isCollapsed = collapsed.has(child.path);
      entries.push({
        kind: "group",
        path: child.path,
        name: groupName(child.path),
        depth,
        collapsed: isCollapsed,
        hidden,
        projectKeys: child.projectKeys,
      });
      walk(child, depth + 1, hidden || isCollapsed);
    }
  }
  walk(root, 0, false);
  return entries;
}

export function layoutHasGroups(layout: readonly LayoutEntry[]): boolean {
  return layout.some((entry) => entry.kind === "group");
}

/** Put a project in a group. Stores nothing when the project's name already says the same. */
export function assignProject(
  assignments: Assignments,
  project: SidebarProject,
  rawPath: string,
): Record<string, string> {
  const path = normalizeGroupPath(rawPath);
  const next = { ...assignments };
  if (path === splitProjectName(project.name).path) delete next[project.key];
  else next[project.key] = path;
  return next;
}

/** New path for `path` when group `from` becomes `to`; undefined when `path` is outside `from`. */
export function rewriteGroupPath(
  path: string,
  from: string,
  to: string,
): string | undefined {
  if (path === from) return normalizeGroupPath(to);
  if (path.startsWith(`${from}/`))
    return normalizeGroupPath(`${to}${path.slice(from.length)}`);
  return undefined;
}

/**
 * Move group `from` (with its subgroups) to `to`. Renaming is a move; so is dissolving, which
 * moves a group into its parent. Projects grouped only by name get an assignment.
 */
export function moveGroup(
  assignments: Assignments,
  projects: readonly SidebarProject[],
  rawFrom: string,
  rawTo: string,
): Record<string, string> {
  const from = normalizeGroupPath(rawFrom);
  const to = normalizeGroupPath(rawTo);
  let next: Record<string, string> = { ...assignments };
  if (!from || from === to) return next;
  for (const project of projects) {
    const moved = rewriteGroupPath(
      placeProject(project, assignments).path,
      from,
      to,
    );
    if (moved !== undefined) next = assignProject(next, project, moved);
  }
  return next;
}

export function dissolveGroup(
  assignments: Assignments,
  projects: readonly SidebarProject[],
  path: string,
): Record<string, string> {
  const normalized = normalizeGroupPath(path);
  return moveGroup(
    assignments,
    projects,
    normalized,
    parentGroupPath(normalized),
  );
}

/** Collapsed group paths after moving group `from` to `to`. */
export function moveCollapsed(
  collapsed: ReadonlySet<string>,
  from: string,
  to: string,
): Set<string> {
  const next = new Set<string>();
  for (const path of collapsed) {
    const moved = rewriteGroupPath(path, from, to);
    if (moved === undefined) next.add(path);
    else if (moved) next.add(moved);
  }
  return next;
}

export function groupPaths(layout: readonly LayoutEntry[]): string[] {
  return layout.flatMap((entry) =>
    entry.kind === "group" ? [entry.path] : [],
  );
}

/** Existing groups matching what the user typed, for the picker. */
export function suggestGroups(
  paths: readonly string[],
  query: string,
  limit = 8,
): string[] {
  const needle = normalizeGroupPath(query).toLowerCase();
  return paths
    .filter(
      (path) =>
        path.toLowerCase() !== needle && path.toLowerCase().includes(needle),
    )
    .slice(0, limit);
}

/** The status a collapsed group should show: the most urgent one among its projects. */
export function pickGroupStatus(
  buckets: Iterable<string>,
): StatusBucket | null {
  const present = new Set(buckets);
  return STATUS_PRIORITY.find((bucket) => present.has(bucket)) ?? null;
}
