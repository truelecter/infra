# AGENTS.md

- AI agent tooling (the `programs.oh-my-pi` and `programs.paseo` Home Manager modules, OMP extensions, Paseo plugins, GSD) comes from the `ai` flake input, `github:truelecter/ai.nix`; change it there, following that repository's `AGENTS.md`. What stays here: the OMP and Paseo settings and the extension and plugin lists in `profiles/home/dev/ai.nix`, the OMP rules, skills, and subagents in `profiles/home/dev/_files/omp/`, and each user's model roles in `home/users/`. Try an unpushed ai.nix change with `--override-input ai path:<its checkout>`; after it is pushed, `nix flake update ai`.
- Klipper and the 3D printer stack (packages, plugins, `services.klipper` and the other printer modules) come from the `klipper` flake input, `github:truelecter/klipper.nix`; change them there, following that repository's `AGENTS.md`. Each printer's configuration stays here in `nixos/hosts/aarch64/<printer>/`. Try an unpushed change with `--override-input klipper path:<its checkout>`.
- The Minecraft server module (`services.yanms`), the modpack packages (`mcs-*`) and the mod jars (`pkgs.minecraftMods`) come from the `yanms` flake input, `github:truelecter/yanms.nix`; change them there, following that repository's `AGENTS.md`. The servers stay here in `nixos/hosts/x86_64/depsos/minecraft-servers/`. Try an unpushed change with `--override-input yanms path:<its checkout>`.

## Commits

- Commit messages follow Conventional Commits with the scopes listed in `.conform.yaml` (for example `feat(tiny-m): ...`; changes to `profiles/home/dev/ai.nix` use `home`).
- Keep the commit body minimal: a few words at most, and none when the subject line already says it all.
