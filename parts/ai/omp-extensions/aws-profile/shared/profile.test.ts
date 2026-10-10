import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import {
  LAUNCH_VAR,
  TARGET_VAR,
  applyBedrockProfile,
  guardPrefix,
  shellQuote,
  type Env,
} from "./profile.ts";

// Runs `echo $AWS_PROFILE` behind the guard the way OMP does: `<prefix> <command>`.
function shellProfile(prefix: string, awsProfile: string | undefined): string {
  const env: Env = { PATH: process.env.PATH };
  if (awsProfile !== undefined) env.AWS_PROFILE = awsProfile;
  return execFileSync(
    "/bin/sh",
    ["-c", `${prefix} echo "\${AWS_PROFILE-unset}"`],
    {
      env: env as NodeJS.ProcessEnv,
      encoding: "utf8",
    },
  ).trim();
}

describe("applyBedrockProfile", () => {
  it("does nothing without a target profile", () => {
    const env: Env = { AWS_PROFILE: "work" };
    assert.equal(applyBedrockProfile(env), null);
    assert.deepEqual(env, { AWS_PROFILE: "work" });
  });

  it("swaps in the target and records an unset launch value", () => {
    const env: Env = { [TARGET_VAR]: "bedrock" };
    assert.deepEqual(applyBedrockProfile(env), {
      target: "bedrock",
      launch: "",
    });
    assert.equal(env.AWS_PROFILE, "bedrock");
    assert.equal(env[LAUNCH_VAR], "");
    assert.equal(env.PI_SHELL_PREFIX, guardPrefix("bedrock", undefined));
  });

  it("remembers a launch profile, e.g. one set by direnv in the terminal", () => {
    const env: Env = { [TARGET_VAR]: "bedrock", AWS_PROFILE: "project" };
    applyBedrockProfile(env);
    assert.equal(env.AWS_PROFILE, "bedrock");
    assert.equal(env[LAUNCH_VAR], "project");
    assert.equal(env.PI_SHELL_PREFIX, guardPrefix("bedrock", "project"));
  });

  it("is idempotent for subagent processes that inherit the parent env", () => {
    const env: Env = { [TARGET_VAR]: "bedrock", AWS_PROFILE: "project" };
    applyBedrockProfile(env);
    const first = { ...env };
    applyBedrockProfile(env);
    assert.deepEqual(env, first);
  });

  it("keeps a user prefix after the guard", () => {
    const env: Env = {
      [TARGET_VAR]: "bedrock",
      CLAUDE_CODE_SHELL_PREFIX: "nice -n 5",
    };
    applyBedrockProfile(env);
    assert.equal(
      env.PI_SHELL_PREFIX,
      `${guardPrefix("bedrock", undefined)} nice -n 5`,
    );
  });

  it("adds no guard when the launch profile already is the target", () => {
    const env: Env = { [TARGET_VAR]: "bedrock", AWS_PROFILE: "bedrock" };
    applyBedrockProfile(env);
    assert.equal(env.PI_SHELL_PREFIX, undefined);
  });
});

describe("guardPrefix in a real shell", () => {
  it("unsets the Bedrock profile when nothing was set at launch", () => {
    assert.equal(
      shellProfile(guardPrefix("bedrock", undefined), "bedrock"),
      "unset",
    );
  });

  it("restores the launch profile", () => {
    assert.equal(
      shellProfile(guardPrefix("bedrock", "project"), "bedrock"),
      "project",
    );
  });

  it("leaves a different profile alone, e.g. one from a project .envrc", () => {
    assert.equal(
      shellProfile(guardPrefix("bedrock", undefined), "other"),
      "other",
    );
    assert.equal(
      shellProfile(guardPrefix("bedrock", "project"), "other"),
      "other",
    );
  });

  it("quotes values safely", () => {
    assert.equal(shellQuote("it's"), `'it'\\''s'`);
    assert.equal(
      shellProfile(guardPrefix("bedrock", "it's"), "bedrock"),
      "it's",
    );
  });
});
