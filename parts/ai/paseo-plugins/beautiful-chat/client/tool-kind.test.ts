import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { describeTool, humanizeToolName, summarizeActivity } from "./tool-kind";

describe("describeTool", () => {
  it("reads a shell call", () => {
    const d = describeTool({
      name: "bash",
      detail: { type: "shell", command: "bun test\n--watch", output: "ok\n" },
    });
    assert.equal(d.kind, "shell");
    assert.equal(d.icon, "Terminal");
    assert.equal(d.label, "Shell Command");
    assert.equal(d.preview, "bun test");
    assert.equal(d.countBucket, "commands");
    assert.equal(d.detailText, "$ bun test\n--watch\nok");
    assert.equal(d.detailLanguage, "bash");
  });

  it("reads file tools by detail type", () => {
    const read = describeTool({
      name: "read",
      detail: { type: "read", filePath: "src/a.ts" },
    });
    assert.deepEqual(
      [read.kind, read.icon, read.preview, read.countBucket],
      ["read", "FileText", "src/a.ts", "files read"],
    );
    const edit = describeTool({
      name: "edit",
      detail: { type: "edit", filePath: "b.ts", unifiedDiff: "-a\n+b" },
    });
    assert.deepEqual(
      [edit.kind, edit.icon, edit.countBucket, edit.detailLanguage],
      ["edit", "FilePen", "files edited", "diff"],
    );
    const write = describeTool({
      name: "write",
      detail: { type: "write", filePath: "c.md" },
    });
    assert.deepEqual(
      [write.kind, write.icon, write.label, write.countBucket],
      ["write", "FilePlus", "Write File", "files edited"],
    );
  });

  it("reads searches, including web search", () => {
    const grep = describeTool({
      name: "grep",
      detail: { type: "search", query: "TODO" },
    });
    assert.deepEqual(
      [grep.kind, grep.label, grep.preview, grep.countBucket],
      ["search", "Search", "TODO", "searches"],
    );
    const web = describeTool({
      name: "web_search",
      detail: {
        type: "search",
        query: "paseo",
        toolName: "web_search",
        webResults: [{ title: "Paseo", url: "https://paseo.sh" }],
      },
    });
    assert.equal(web.label, "Web Search");
    assert.equal(web.detailText, "Paseo\nhttps://paseo.sh");
  });

  it("names an MCP tool by its tool part", () => {
    const d = describeTool({
      name: "mcp__rbks__jira_get_issue",
      detail: { type: "unknown", input: { key: "RI-1" }, output: null },
    });
    assert.deepEqual(
      [d.kind, d.icon, d.label, d.countBucket],
      ["mcp", "Plug", "jira_get_issue", "tools"],
    );
    assert.equal(d.detailText, '{\n  "key": "RI-1"\n}');
  });

  it("treats Paseo agent tools as paseo and humanizes the name", () => {
    const d = describeTool({
      name: "create_agent",
      detail: { type: "unknown", input: {}, output: {} },
    });
    assert.deepEqual(
      [d.kind, d.icon, d.label],
      ["paseo", "Users", "Create agent"],
    );
  });

  it("previews plain_text by its label and maps ask", () => {
    const d = describeTool({
      name: "ask",
      detail: { type: "plain_text", label: "Ship it?", text: "Yes" },
    });
    assert.deepEqual(
      [d.kind, d.preview, d.detailText],
      ["ask", "Ship it?", "Yes"],
    );
  });

  it("maps sub-agents to task and unknown names to other", () => {
    const task = describeTool({
      name: "task",
      detail: {
        type: "sub_agent",
        subAgentType: "scout",
        description: "Map the repo",
        log: "",
      },
    });
    assert.deepEqual(
      [task.kind, task.icon, task.label, task.preview],
      ["task", "Bot", "Scout", "Map the repo"],
    );
    const other = describeTool({
      name: "lsp",
      detail: { type: "unknown", input: null, output: null },
    });
    assert.deepEqual(
      [other.kind, other.icon, other.label, other.preview],
      ["other", "Wrench", "lsp", ""],
    );
    const think = describeTool({
      name: "think",
      detail: { type: "plain_text", text: "hmm" },
    });
    assert.equal(think.icon, "Brain");
  });

  it("previews a fetch by its url", () => {
    const d = describeTool({
      name: "fetch",
      detail: { type: "fetch", url: "https://a.b/c" },
    });
    assert.equal(d.preview, "https://a.b/c");
  });
});

describe("summarizeActivity", () => {
  it("joins the non-empty buckets and always ends with the total", () => {
    assert.equal(
      summarizeActivity([
        "commands",
        "commands",
        "files read",
        "files read",
        "files edited",
        "tools",
      ]),
      "Ran 2 commands · Read 2 files · Edited 1 file · Used 6 tools",
    );
    assert.equal(summarizeActivity(["tools"]), "Used 1 tool");
    assert.equal(
      summarizeActivity(["searches", "searches"]),
      "Ran 2 searches · Used 2 tools",
    );
  });
});

describe("humanizeToolName", () => {
  it("turns snake case into a sentence-case label", () => {
    assert.equal(humanizeToolName("get_agent_status"), "Get agent status");
  });
});
