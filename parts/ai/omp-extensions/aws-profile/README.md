# aws-profile (OMP extension)

Makes [Oh My Pi](https://github.com/can1357/oh-my-pi) (`omp`) use one fixed AWS profile for Amazon Bedrock, wherever it is started, without that profile leaking into the agent's shell commands.

## Why

OMP's Bedrock provider takes its AWS profile only from `AWS_PROFILE`. Its request options do have a `profile` field (`providerOptions` in `packages/ai/src/registry/amazon-bedrock.ts`), but no setting fills it for chat requests. That causes two problems:

- Started from a terminal inside a project whose `.envrc` sets `AWS_PROFILE`, OMP would call Bedrock with the project's profile.
- With `AWS_PROFILE` set for Bedrock (for example in `~/.omp/agent/.env`), every `aws` command the agent runs without `--profile` would hit the Bedrock account.

## What it does

When OMP loads it (before any Bedrock request or agent shell command):

1. Records `AWS_PROFILE` as it was at launch in `OMP_AWS_PROFILE_LAUNCH`, once. Subagent processes inherit that record and don't overwrite it.
2. Sets `AWS_PROFILE` to `OMP_BEDROCK_AWS_PROFILE` for OMP itself.
3. Adds a guard to `PI_SHELL_PREFIX`, which OMP runs before every agent shell command. While `AWS_PROFILE` still holds the Bedrock profile, the guard puts back the launch value, or unsets it if there was none. Any other value, such as one a project `.envrc` sets through OMP's direnv support, is left alone. An existing prefix is kept after the guard.

The guard runs at execution time, so it doesn't appear in approval prompts or the transcript. If `OMP_BEDROCK_AWS_PROFILE` is not set, the extension does nothing.

## Install

Packaged as `pkgs.omp-extensions.aws-profile` (flake output `omp-extension-aws-profile`). Enable it through the Home Manager module, listed before other extensions; OMP loads it on the next session start:

```nix
programs.oh-my-pi.extensions = [pkgs.omp-extensions.aws-profile];
```

Name the profile in `~/.omp/agent/.env` (OMP loads it for keys that aren't already set), or in `programs.oh-my-pi.environment` if the name may live in the Nix store:

```sh
OMP_BEDROCK_AWS_PROFILE=my-bedrock-profile
```

The region comes from the profile's `region` in `~/.aws/config`; `global.` inference profiles fall back to `us-east-1`.

## Limits

- It relies on OMP building its shell configuration after extensions load. OMP caches that configuration, so if a future version builds it earlier, the guard would be missing: rerun the check below after OMP upgrades.
- Shell commands see the launch value, not the Bedrock profile, even when that launch value came from a different directory's `.envrc`.

## Develop

`nix build .#omp-extension-aws-profile` runs the tests. Type checks, from this folder:

```sh
bun install
bun run typecheck
bun run test
```

The tests run the guard in a real `/bin/sh`. End-to-end check, which makes two small Bedrock calls. Expect `[unset]`, then `[some-project]`, while the calls themselves still succeed:

```sh
P='Run exactly this bash command and reply with its raw output only: echo "AWS_PROFILE=[${AWS_PROFILE-unset}]"'
M=amazon-bedrock/global.anthropic.claude-sonnet-5
env -u AWS_PROFILE omp -p "$P" --no-session --tools=bash --approval-mode yolo --thinking off --model $M
AWS_PROFILE=some-project omp -p "$P" --no-session --tools=bash --approval-mode yolo --thinking off --model $M
```
