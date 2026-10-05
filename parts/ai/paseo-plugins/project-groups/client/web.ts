// Everything that touches the DOM. Paseo's plugin API cannot add rows to the sidebar's project
// list, so on web and desktop this module adds them to the rendered page instead:
//
// - Group header rows go into the project list container, next to the rows React owns. React
//   tolerates extra siblings; it only moves and removes its own nodes.
// - CSS `order` (the container is a flex column) puts each group's projects behind its header,
//   without moving React's nodes.
// - A data attribute plus our stylesheet hides the projects of a collapsed group.
// - A "Move to group" button goes into each project row's trailing actions.
//
// A MutationObserver re-applies all of this whenever Paseo re-renders the sidebar. Every write
// is skipped when the DOM already has the value, so our own changes settle after one pass.

import { Platform } from "react-native";
import {
  assignProject,
  buildLayout,
  dissolveGroup,
  groupPaths,
  layoutHasGroups,
  moveCollapsed,
  moveGroup,
  normalizeGroupPath,
  parentGroupPath,
  pickGroupStatus,
  placeProject,
  suggestGroups,
  type Assignments,
  type LayoutEntry,
  type SidebarProject,
} from "./groups.ts";
import type { AssignmentChange } from "./sync.ts";

// Plugins typecheck without the DOM library. Declare only what this module uses.
interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly height: number;
}
interface Style {
  getPropertyValue(name: string): string;
  setProperty(name: string, value: string): void;
  removeProperty(name: string): string;
}
interface TextNode {
  readonly nodeType: number;
  nodeValue: string | null;
}
interface DomEvent {
  readonly key: string;
  readonly target: unknown;
  stopPropagation(): void;
  preventDefault(): void;
}
type Listener = (event: DomEvent) => void;
interface El {
  readonly parentElement: El | null;
  readonly children: ArrayLike<El>;
  readonly childNodes: ArrayLike<TextNode>;
  readonly firstElementChild: El | null;
  readonly isConnected: boolean;
  readonly style: Style;
  textContent: string | null;
  innerHTML: string;
  className: string;
  closest(selector: string): El | null;
  querySelector(selector: string): El | null;
  querySelectorAll(selector: string): ArrayLike<El>;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  appendChild<T extends El>(node: T): T;
  insertBefore<T extends El>(node: T, reference: El | null): T;
  remove(): void;
  contains(node: unknown): boolean;
  addEventListener(type: string, listener: Listener, capture?: boolean): void;
  removeEventListener(type: string, listener: Listener, capture?: boolean): void;
  getBoundingClientRect(): Rect;
  focus(): void;
}
interface InputEl extends El {
  value: string;
  select(): void;
}
interface MutationRecordLike {
  readonly target: unknown;
}
declare const document: {
  readonly head: El;
  readonly body: El;
  createElement(tagName: "input"): InputEl;
  createElement(tagName: string): El;
  querySelectorAll(selector: string): ArrayLike<El>;
  addEventListener(type: string, listener: Listener, capture?: boolean): void;
  removeEventListener(type: string, listener: Listener, capture?: boolean): void;
};
declare const window: {
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly localStorage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
  requestAnimationFrame(callback: () => void): number;
  cancelAnimationFrame(handle: number): void;
  addEventListener(type: "focus" | "resize", listener: () => void): void;
  removeEventListener(type: "focus" | "resize", listener: () => void): void;
};
declare class MutationObserver {
  constructor(callback: (records: MutationRecordLike[]) => void);
  observe(target: El, options: { childList: boolean; subtree: boolean; characterData: boolean }): void;
  disconnect(): void;
}

const PLUGIN_ID = "project-groups";
const ROW_PREFIX = "sidebar-project-row-";
// Paseo badges a project row only while the project is collapsed; otherwise each workspace row
// carries its own status. Read both.
const STATUS_PREFIXES = ["project-status-indicator-", "workspace-status-indicator-"] as const;
const STATUS_SELECTOR = STATUS_PREFIXES.map((prefix) => `[data-testid^="${prefix}"]`).join(", ");
const SCROLL_ROOT = '[data-testid="sidebar-project-workspace-list-scroll"]';
const COLLAPSED_KEY = "paseo-plugin:project-groups:collapsed";
const INDENT_PX = 12;
const MAX_INDENT_LEVELS = 12;
const TEXT_NODE = 3;

// Lucide icons (ISC), inlined because plugin DOM code cannot render Paseo's icon components.
const ICONS = {
  folder:
    '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  folderOpen:
    '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
  folderInput:
    '<path d="M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1"/><path d="M2 13h10"/><path d="m9 16 3-3-3-3"/>',
  folderX:
    '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="m9.5 10.5 5 5"/><path d="m14.5 10.5-5 5"/>',
  pencil:
    '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
} as const;

function svg(name: keyof typeof ICONS): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

// Colors come from the CSS variables Unistyles writes for the active theme, so a theme switch
// restyles these rows along with Paseo's own.
function buildCss(): string {
  const indents = Array.from({ length: MAX_INDENT_LEVELS }, (_, index) => {
    const level = index + 1;
    return `[data-pg-depth="${level}"] { padding-left: ${level * INDENT_PX}px !important; }`;
  }).join("\n");
  return `
[data-pg-hidden] { display: none !important; }
${indents}
.pg-header {
  display: flex; flex-direction: row; align-items: center; gap: 8px;
  box-sizing: border-box; min-height: 36px; padding: 8px; margin-bottom: 4px; border-radius: 8px;
  cursor: pointer; user-select: none; outline: none;
  color: var(--colors-foreground-muted, #a1a5a4);
  font-family: var(--paseo-ui-font, system-ui, sans-serif); font-size: 14px; line-height: normal;
}
.pg-header:hover { background-color: var(--colors-surface-sidebar-hover, rgba(127, 127, 127, 0.12)); }
.pg-header:active { background-color: var(--colors-surface2, rgba(127, 127, 127, 0.2)); }
.pg-header:focus-visible { box-shadow: inset 0 0 0 1px var(--colors-ring, currentColor); }
.pg-lead {
  position: relative; flex-shrink: 0; width: 16px; height: 20px;
  display: flex; align-items: center; justify-content: center;
}
.pg-icon { display: flex; }
.pg-lead svg { width: 16px; height: 16px; }
.pg-chevron svg { transition: transform 120ms ease; }
.pg-header[aria-expanded="true"] .pg-chevron svg { transform: rotate(90deg); }
.pg-header[aria-expanded="true"] .pg-folder-closed,
.pg-header[aria-expanded="false"] .pg-folder-open,
.pg-header .pg-chevron,
.pg-header:hover .pg-folder-open,
.pg-header:hover .pg-folder-closed { display: none; }
.pg-header:hover .pg-chevron { display: flex; }
.pg-dot {
  position: absolute; right: -3px; bottom: 0; width: 8px; height: 8px; border-radius: 50%;
  box-shadow: 0 0 0 2px var(--colors-surface-sidebar, transparent); display: none;
}
.pg-header[aria-expanded="false"] .pg-dot[data-status] { display: block; }
.pg-dot[data-status="needs_input"] { background: var(--colors-status-dot-warning, #db932e); }
.pg-dot[data-status="failed"] { background: var(--colors-status-dot-danger, #f7796d); }
.pg-dot[data-status="running"] { background: var(--colors-status-dot-running, #5caaf6); }
.pg-dot[data-status="attention"] { background: var(--colors-status-dot-success, #35c264); }
.pg-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pg-count {
  flex-shrink: 0; font-size: 12px; font-variant-numeric: tabular-nums;
  color: var(--colors-foreground-extra-muted, currentColor);
}
.pg-header[aria-expanded="true"] .pg-count { display: none; }
.pg-actions {
  display: flex; flex-direction: row; align-items: center; gap: 2px; flex-shrink: 0;
  margin-right: -6px; opacity: 0;
}
.pg-header:hover .pg-actions, .pg-header:focus-within .pg-actions { opacity: 1; }
.pg-header:hover .pg-count, .pg-header:focus-within .pg-count { display: none; }
.pg-action, .pg-assign {
  flex-shrink: 0; width: 24px; height: 24px; border-radius: 6px; outline: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--colors-foreground-muted, #a1a5a4);
}
.pg-action svg, .pg-assign svg { width: 14px; height: 14px; }
.pg-action:hover, .pg-assign:hover, .pg-action:focus-visible, .pg-assign:focus-visible {
  color: var(--colors-foreground, #fafafa); background-color: var(--colors-surface2, rgba(127, 127, 127, 0.2));
}
.pg-assign { opacity: 0; }
[data-testid^="${ROW_PREFIX}"]:hover .pg-assign, .pg-assign:focus-visible, .pg-assign[data-pg-open] { opacity: 1; }
@media (hover: none) { .pg-assign, .pg-actions { opacity: 1; } }
.pg-popover {
  position: fixed; z-index: 2147483000; box-sizing: border-box; width: 260px; padding: 10px;
  display: flex; flex-direction: column; gap: 8px;
  border-radius: 10px; border: 1px solid var(--colors-border, rgba(127, 127, 127, 0.3));
  background: var(--colors-surface1, #1e2120); color: var(--colors-foreground, #fafafa);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  font-family: var(--paseo-ui-font, system-ui, sans-serif); font-size: 13px;
}
.pg-pop-title {
  color: var(--colors-foreground-muted, #a1a5a4); font-size: 12px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.pg-pop-input {
  box-sizing: border-box; width: 100%; margin: 0; padding: 6px 8px; border-radius: 6px; outline: none;
  border: 1px solid var(--colors-border, rgba(127, 127, 127, 0.3));
  background: var(--colors-surface0, transparent); color: var(--colors-foreground, #fafafa);
  font: inherit;
}
.pg-pop-input:focus { border-color: var(--colors-accent, currentColor); }
.pg-pop-list { display: flex; flex-direction: column; max-height: 180px; overflow-y: auto; }
.pg-pop-list:empty { display: none; }
.pg-pop-option {
  padding: 5px 8px; border-radius: 6px; cursor: pointer;
  color: var(--colors-foreground-muted, #a1a5a4);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.pg-pop-option:hover, .pg-pop-option[data-active] {
  background: var(--colors-surface2, rgba(127, 127, 127, 0.2)); color: var(--colors-foreground, #fafafa);
}
.pg-pop-hint { font-size: 11px; color: var(--colors-foreground-extra-muted, #717574); }
.pg-pop-footer { display: flex; flex-direction: row; align-items: center; gap: 8px; }
.pg-pop-spacer { flex: 1; }
.pg-pop-button {
  padding: 5px 10px; border-radius: 6px; cursor: pointer; user-select: none;
  color: var(--colors-foreground-muted, #a1a5a4);
}
.pg-pop-button:hover { background: var(--colors-surface2, rgba(127, 127, 127, 0.2)); color: var(--colors-foreground, #fafafa); }
.pg-pop-primary, .pg-pop-primary:hover {
  background: var(--colors-accent, #20744a); color: var(--colors-accent-foreground, #ffffff);
}
.pg-pop-primary:hover { filter: brightness(1.1); }
`;
}

// Events that would otherwise reach the row's Pressable, drag handle, or context menu.
const SWALLOWED_EVENTS = [
  "pointerdown",
  "pointerup",
  "mousedown",
  "mouseup",
  "click",
  "dblclick",
  "touchstart",
  "touchend",
  "contextmenu",
  "keydown",
  "keyup",
] as const;

function element(tagName: string, className: string, attributes: Record<string, string> = {}): El {
  const node = document.createElement(tagName);
  node.className = className;
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

function setAttr(node: El, name: string, value: string | null) {
  if (value === null) {
    if (node.getAttribute(name) !== null) node.removeAttribute(name);
  } else if (node.getAttribute(name) !== value) {
    node.setAttribute(name, value);
  }
}

function setStyle(node: El, name: string, value: string) {
  if (node.style.getPropertyValue(name) === value) return;
  if (value) node.style.setProperty(name, value);
  else node.style.removeProperty(name);
}

function setText(node: El, text: string) {
  if (node.textContent !== text) node.textContent = text;
}

/** A div that acts as a button and keeps its events away from whatever it sits in. */
function actionButton(className: string, icon: keyof typeof ICONS, label: string, onPress: () => void): El {
  const button = element("div", className, {
    role: "button",
    tabindex: "0",
    "aria-label": label,
    title: label,
  });
  button.innerHTML = svg(icon);
  for (const type of SWALLOWED_EVENTS) {
    button.addEventListener(type, (event) => {
      event.stopPropagation();
      if (type === "click") {
        event.preventDefault();
        onPress();
      } else if (type === "keydown" && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        onPress();
      }
    });
  }
  return button;
}

interface ScannedProject extends SidebarProject {
  item: El;
  row: El;
}

interface ScannedList {
  container: El;
  projects: ScannedProject[];
}

// Row -> [role=group] project block -> dnd-kit sortable item -> project list container.
function scan(): ScannedList[] {
  const lists = new Map<El, ScannedProject[]>();
  const rows = document.querySelectorAll(`[data-testid^="${ROW_PREFIX}"]`);
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const block = row.closest('[role="group"]');
    const item = block?.parentElement;
    const container = item?.parentElement;
    if (!block || !item || !container) continue;
    const key = (row.getAttribute("data-testid") ?? "").slice(ROW_PREFIX.length);
    const name = block.getAttribute("aria-label") ?? "";
    const projects = lists.get(container) ?? [];
    projects.push({ key, name, item, row });
    lists.set(container, projects);
  }
  return [...lists].map(([container, projects]) => ({ container, projects }));
}

function titleOf(project: ScannedProject): El | null {
  const title = project.row.children[0]?.children[1]?.firstElementChild ?? null;
  return title?.getAttribute("dir") === "auto" ? title : null;
}

// Rewrites only text that Paseo wrote (the full name) or that we wrote before.
function setLabel(project: ScannedProject, label: string) {
  const title = titleOf(project);
  if (!title || title.childNodes.length !== 1) return;
  const node = title.childNodes[0];
  if (node.nodeType !== TEXT_NODE || node.nodeValue === label) return;
  if (node.nodeValue !== project.name && node.nodeValue !== title.getAttribute("data-pg-label")) return;
  node.nodeValue = label;
  title.setAttribute("data-pg-label", label);
}

function memberStatus(keys: readonly string[], byKey: ReadonlyMap<string, ScannedProject>) {
  const buckets: string[] = [];
  for (const key of keys) {
    const indicators = byKey.get(key)?.item.querySelectorAll(STATUS_SELECTOR);
    for (let index = 0; index < (indicators?.length ?? 0); index++) {
      const testId = indicators?.[index].getAttribute("data-testid") ?? "";
      const prefix = STATUS_PREFIXES.find((candidate) => testId.startsWith(candidate));
      if (prefix) buckets.push(testId.slice(prefix.length));
    }
  }
  return pickGroupStatus(buckets);
}

function loadCollapsed(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(COLLAPSED_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : []);
  } catch {
    return new Set();
  }
}

function saveCollapsed(collapsed: ReadonlySet<string>) {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
  } catch {
    // Storage can be unavailable (private windows); collapse then lasts for the session.
  }
}

interface PopoverOptions {
  anchor: El;
  title: string;
  value: string;
  placeholder: string;
  hint: string;
  suggestions(query: string): string[];
  onSave(value: string): void;
  secondary?: { label: string; onPress(): void };
}

interface Popover {
  anchor: El;
  close(): void;
}

function openPopover(options: PopoverOptions, onClosed: () => void): Popover {
  const root = element("div", "pg-popover", { role: "dialog", "aria-label": options.title });
  const title = root.appendChild(element("div", "pg-pop-title"));
  title.textContent = options.title;
  const input = root.appendChild(document.createElement("input"));
  input.className = "pg-pop-input";
  input.setAttribute("placeholder", options.placeholder);
  input.setAttribute("aria-label", options.title);
  input.setAttribute("spellcheck", "false");
  input.setAttribute("autocomplete", "off");
  input.value = options.value;
  const list = root.appendChild(element("div", "pg-pop-list", { role: "listbox" }));
  const hint = root.appendChild(element("div", "pg-pop-hint"));
  hint.textContent = options.hint;
  const footer = root.appendChild(element("div", "pg-pop-footer"));

  let active = -1;
  let shown: string[] = [];
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener("pointerdown", onOutside, true);
    root.remove();
    onClosed();
  }

  function save(value: string) {
    close();
    options.onSave(value);
  }

  function renderList() {
    shown = options.suggestions(input.value);
    active = Math.min(active, shown.length - 1);
    list.innerHTML = "";
    shown.forEach((path, index) => {
      const option = list.appendChild(element("div", "pg-pop-option", { role: "option" }));
      option.textContent = path;
      setAttr(option, "data-active", index === active ? "" : null);
      setAttr(option, "aria-selected", String(index === active));
      option.addEventListener("pointerdown", (event) => event.preventDefault());
      option.addEventListener("click", () => save(path));
    });
  }

  function button(label: string, className: string, onPress: () => void) {
    const node = footer.appendChild(element("div", `pg-pop-button ${className}`, { role: "button", tabindex: "0" }));
    node.textContent = label;
    node.addEventListener("click", onPress);
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onPress();
      }
    });
  }

  if (options.secondary) {
    const { label, onPress } = options.secondary;
    button(label, "", () => {
      close();
      onPress();
    });
  }
  footer.appendChild(element("div", "pg-pop-spacer"));
  button("Cancel", "", close);
  button("Save", "pg-pop-primary", () => save(input.value));

  input.addEventListener("input", () => {
    active = -1;
    renderList();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (shown.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      active = (active + step + shown.length + 1) % (shown.length + 1);
      if (active === shown.length) active = -1;
      renderList();
    } else if (event.key === "Enter") {
      event.preventDefault();
      save(active >= 0 ? shown[active] : input.value);
    }
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
    // Keep Paseo's global handlers out of typing in this box.
    event.stopPropagation();
  });

  function onOutside(event: DomEvent) {
    if (!root.contains(event.target) && !options.anchor.contains(event.target)) close();
  }
  document.addEventListener("pointerdown", onOutside, true);

  renderList();
  root.style.setProperty("visibility", "hidden");
  document.body.appendChild(root);
  const anchor = options.anchor.getBoundingClientRect();
  const height = root.getBoundingClientRect().height;
  const width = 260;
  const left = Math.max(8, Math.min(anchor.right - width, window.innerWidth - width - 8));
  const below = anchor.bottom + 4;
  const top = below + height + 8 > window.innerHeight ? Math.max(8, anchor.top - height - 4) : below;
  root.style.setProperty("left", `${left}px`);
  root.style.setProperty("top", `${top}px`);
  root.style.removeProperty("visibility");
  input.focus();
  input.select();

  return { anchor: options.anchor, close };
}

export interface SidebarGroups {
  setAssignments(assignments: Assignments): void;
  stop(): void;
}

export interface SidebarGroupsOptions {
  /** Apply and persist a change to the stored assignments. */
  update(change: AssignmentChange): void;
}

export function startSidebarGroups(options: SidebarGroupsOptions): SidebarGroups | null {
  if (Platform.OS !== "web") return null;

  const style = element("style", "", { "data-paseo-plugin": PLUGIN_ID });
  style.textContent = buildCss();
  document.head.appendChild(style);

  let assignments: Assignments = {};
  let collapsed = loadCollapsed();
  let projects = new Map<string, SidebarProject>();
  let paths: string[] = [];
  let watched: El[] = [];
  let popover: Popover | null = null;
  let frame = 0;
  let stopped = false;

  function knownProjects(): SidebarProject[] {
    return [...projects.values()];
  }

  function toggle(path: string) {
    collapsed = new Set(collapsed);
    if (collapsed.has(path)) collapsed.delete(path);
    else collapsed.add(path);
    saveCollapsed(collapsed);
    apply();
  }

  function moveCollapsedGroup(from: string, to: string) {
    collapsed = moveCollapsed(collapsed, from, to);
    saveCollapsed(collapsed);
  }

  function showPopover(popoverOptions: PopoverOptions) {
    popover?.close();
    setAttr(popoverOptions.anchor, "data-pg-open", "");
    const opened = openPopover(popoverOptions, () => {
      setAttr(popoverOptions.anchor, "data-pg-open", null);
      if (popover === opened) popover = null;
    });
    popover = opened;
  }

  function openAssign(anchor: El) {
    const project = projects.get(anchor.getAttribute("data-pg-key") ?? "");
    if (!project) return;
    const { path } = placeProject(project, assignments);
    showPopover({
      anchor,
      title: `Group for ${project.name}`,
      value: path,
      placeholder: "Group name",
      hint: "Use / to nest groups, e.g. work/aws",
      suggestions: (query) => suggestGroups(paths, query),
      onSave: (value) => options.update((current) => assignProject(current, project, value)),
      secondary: path
        ? {
            label: "Remove",
            onPress: () => options.update((current) => assignProject(current, project, "")),
          }
        : undefined,
    });
  }

  function openRename(anchor: El, path: string) {
    showPopover({
      anchor,
      title: `Rename group ${path}`,
      value: path,
      placeholder: "Group name",
      hint: "Use / to nest groups, e.g. work/aws",
      suggestions: () => [],
      onSave: (value) => {
        const to = normalizeGroupPath(value);
        if (!to || to === path) return;
        const known = knownProjects();
        moveCollapsedGroup(path, to);
        options.update((current) => moveGroup(current, known, path, to));
      },
    });
  }

  function dissolve(path: string) {
    const known = knownProjects();
    moveCollapsedGroup(path, parentGroupPath(path));
    options.update((current) => dissolveGroup(current, known, path));
  }

  function createHeader(path: string): El {
    const header = element("div", "pg-header", {
      role: "button",
      tabindex: "0",
      "data-pg-group": path,
    });
    const lead = header.appendChild(element("div", "pg-lead"));
    for (const [className, icon] of [
      ["pg-folder-closed", "folder"],
      ["pg-folder-open", "folderOpen"],
      ["pg-chevron", "chevronRight"],
    ] as const) {
      lead.appendChild(element("span", `pg-icon ${className}`)).innerHTML = svg(icon);
    }
    lead.appendChild(element("span", "pg-dot"));
    header.appendChild(element("div", "pg-name"));
    header.appendChild(element("div", "pg-count"));
    const actions = header.appendChild(element("div", "pg-actions"));
    const rename = actions.appendChild(
      actionButton("pg-action", "pencil", "Rename group", () => {
        openRename(rename, header.getAttribute("data-pg-group") ?? path);
      }),
    );
    actions.appendChild(
      actionButton("pg-action", "folderX", "Ungroup", () => {
        dissolve(header.getAttribute("data-pg-group") ?? path);
      }),
    );
    header.addEventListener("click", () => toggle(header.getAttribute("data-pg-group") ?? path));
    header.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggle(header.getAttribute("data-pg-group") ?? path);
    });
    return header;
  }

  function ensureAssignButton(project: ScannedProject) {
    const trailing = project.row.children[1];
    if (!trailing) return;
    let button = trailing.querySelector(":scope > .pg-assign");
    if (!button) {
      const created = actionButton("pg-assign", "folderInput", "Move to group", () => openAssign(created));
      button = trailing.insertBefore(created, trailing.firstElementChild);
    }
    setAttr(button, "data-pg-key", project.key);
    setAttr(button, "aria-label", `Move ${project.name} to a group`);
  }

  function resetProject(project: ScannedProject) {
    setStyle(project.item, "order", "");
    setAttr(project.item, "data-pg-depth", null);
    setAttr(project.item, "data-pg-hidden", null);
    setLabel(project, project.name);
  }

  function applyHeader(
    header: El,
    entry: Extract<LayoutEntry, { kind: "group" }>,
    order: number,
    byKey: ReadonlyMap<string, ScannedProject>,
  ) {
    const count = entry.projectKeys.length;
    setStyle(header, "order", String(order));
    setStyle(header, "margin-left", entry.depth ? `${entry.depth * INDENT_PX}px` : "");
    setAttr(header, "aria-expanded", String(!entry.collapsed));
    setAttr(header, "aria-label", `${entry.path}, ${count} ${count === 1 ? "project" : "projects"}`);
    setAttr(header, "title", entry.path);
    setAttr(header, "data-pg-hidden", entry.hidden ? "" : null);
    const name = header.querySelector(".pg-name");
    const countNode = header.querySelector(".pg-count");
    const dot = header.querySelector(".pg-dot");
    if (name) setText(name, entry.name);
    if (countNode) setText(countNode, String(count));
    if (dot) setAttr(dot, "data-status", entry.collapsed ? memberStatus(entry.projectKeys, byKey) : null);
  }

  function applyList(list: ScannedList) {
    const layout = buildLayout(list.projects, assignments, collapsed);
    const byKey = new Map(list.projects.map((project) => [project.key, project]));
    const headers = new Map<string, El>();
    for (let index = 0; index < list.container.children.length; index++) {
      const child = list.container.children[index];
      const path = child.getAttribute("data-pg-group");
      if (path !== null) headers.set(path, child);
    }

    for (const project of list.projects) ensureAssignButton(project);

    if (!layoutHasGroups(layout)) {
      for (const project of list.projects) resetProject(project);
      for (const header of headers.values()) header.remove();
      return;
    }

    paths.push(...groupPaths(layout));
    const used = new Set<string>();
    layout.forEach((entry, index) => {
      const order = index + 1;
      if (entry.kind === "group") {
        used.add(entry.path);
        const header = headers.get(entry.path) ?? list.container.appendChild(createHeader(entry.path));
        applyHeader(header, entry, order, byKey);
        return;
      }
      const project = byKey.get(entry.key);
      if (!project) return;
      setStyle(project.item, "order", String(order));
      setAttr(project.item, "data-pg-depth", entry.depth ? String(Math.min(entry.depth, MAX_INDENT_LEVELS)) : null);
      setAttr(project.item, "data-pg-hidden", entry.hidden ? "" : null);
      setLabel(project, entry.label);
    });
    for (const [path, header] of headers) if (!used.has(path)) header.remove();
  }

  function apply() {
    if (stopped) return;
    if (!style.isConnected) document.head.appendChild(style);
    const lists = scan();
    projects = new Map();
    for (const list of lists) {
      for (const project of list.projects) projects.set(project.key, { key: project.key, name: project.name });
    }
    paths = [];
    for (const list of lists) applyList(list);
    paths = [...new Set(paths)];
    watched = lists.map((list) => list.container.closest(SCROLL_ROOT) ?? list.container);
    if (popover && !popover.anchor.isConnected) popover.close();
  }

  function schedule() {
    if (frame || stopped) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      apply();
    });
  }

  // Streaming agent output mutates the page constantly. Only react to the sidebar, unless the
  // sidebar is not (or no longer) on the page, in which case any change may have brought it back.
  function touchesSidebar(records: MutationRecordLike[]): boolean {
    if (watched.length === 0 || watched.some((root) => !root.isConnected)) return true;
    return records.some((record) => watched.some((root) => root.contains(record.target)));
  }

  const observer = new MutationObserver((records) => {
    if (touchesSidebar(records)) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  schedule();

  return {
    setAssignments(next) {
      assignments = next;
      apply();
    },
    stop() {
      stopped = true;
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      popover?.close();
      for (const list of scan()) {
        for (const project of list.projects) resetProject(project);
      }
      const leftovers = document.querySelectorAll(".pg-header, .pg-assign");
      for (let index = 0; index < leftovers.length; index++) leftovers[index].remove();
      style.remove();
    },
  };
}

export function onWindowFocus(listener: () => void): () => void {
  if (Platform.OS !== "web") return () => {};
  window.addEventListener("focus", listener);
  return () => window.removeEventListener("focus", listener);
}
