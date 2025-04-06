<div align="center">
  <h1>truelecter's infra</h1>
  <img alt="hosts build" src="https://img.shields.io/github/actions/workflow/status/truelecter/infra/build-hosts.yaml?branch=master&event=push&style=for-the-badge&logo=github&label=hosts&labelColor=303446&color=40a02b" />
  <img alt="shells build" src="https://img.shields.io/github/actions/workflow/status/truelecter/infra/build-devshell.yaml?branch=master&event=push&style=for-the-badge&logo=github&label=shells&labelColor=303446&color=40a02b" />
  <img alt="nixos 24.11" src="https://img.shields.io/badge/NixOS-24.11-4bb7c9?style=for-the-badge&logo=nixos&logoColor=white&labelColor=303446" />
</div>

## Introduction

This repository contains the Nix code that builds my systems using flake-parts. None of these NixOS and Darwin configurations will work out of the box for you (unless do not have my keys 😱).<br/>
This repo is intended for sharing some interesting parts of my infra and for some inspiration for how I was inspired myself based on other similar repos.<br/>

## Why Nix?

Nix allows for easy to manage, collaborative, reproducible deployments. This means that once something is setup and configured once, it works forever. If someone else shares their configuration, anyone can make use of it.

This flake is configured using [flake-parts](https://github.com/hercules-ci/flake-parts) for a modular approach.

## Repository Structure

- `/nixos` - NixOS configurations
  - `/nixos/hosts/x86_64` - x86_64 NixOS hosts
    - **tl-wsl** - WSL system
    - **depsos** - Server for publically hosted services
    - **nas** - NAS with some multimedia stuff
    - **sirius** - Home Assistant and 3D printer coordination
  - `/nixos/hosts/aarch64` - aarch64 NixOS hosts
    - 3D Printers:
      - **voron** - Voron 2.4 300mm
      - **vzbot235** - VzBot 235
      - **tiny-m** - Tiny-M 150mm
    - Misc:
      - **oracle** - Game servers and remote builder
- `/darwin` - Darwin configurations
  - `/darwin/hosts` - aarch64-darwin hosts
    - **suadbook** - Main workstation
    - **tl-mm4** - aarch64-darwin and aarch64-linux builder
- `/home` - Home-manager configurations
- `/parts` - flake-parts modules
  - `/parts/klipper` - Klipper 3D printer related configurations
  - `/parts/raspberry-pi` - Raspberry Pi specific configurations
  - `/parts/rockchip` - Rockchip SoC configurations
  - `/parts/k8s` - K3S wrappers and version pinning
  - `/parts/minecraft-servers` - Minecraft server configurations
- `/profiles` - Shared system profiles
- `/lib` - Helper functions and utilities
- `/secrets` - Encrypted secrets (using sops-nix)
- `/shell` - Development shell configurations

## Apply Configurations

### NixOS Hosts

For NixOS hosts, you can use [deploy-rs](https://github.com/serokell/deploy-rs) to deploy configurations:

```bash
deploy --skip-checks '.#<hostname>'
```

### Darwin Hosts

For macOS hosts running nix-darwin:

```bash
# First-time setup - bootstrap aarch64-linux builder
nix run github:nixos/nixpkgs/nixpkgs-23.11-darwin#darwin.linux-builder
nix build --builders 'builder@localhost aarch64-linux /etc/nix/builder_ed25519' .#darwinConfigurations.<hostname>.system

# Switch configuration (local)
darwin-rebuild switch --flake .#<hostname>

# Switch configuration (remote)
deploy --skip-checks '.#<hostname>'
```

## Development

A development shell is available with useful utilities:

```bash
nix develop
```

## Resources

### Core

- [hercules-ci/flake-parts](https://github.com/hercules-ci/flake-parts) - Core of this flake.
- [LnL7/nix-darwin](https://github.com/LnL7/nix-darwin) - Darwin hosts management.
- [nix-community/NixOS-WSL](https://github.com/nix-community/NixOS-WSL) - WSL support for NixOS.
- [nix-community/home-manager](https://github.com/nix-community/home-manager) - Dotfiles and user management.
- [serokell/deploy-rs](https://github.com/serokell/deploy-rs) - Deployment tool for all the hosts.
- [Mic92/sops-nix](https://github.com/Mic92/sops-nix) - Secrets management.

### Repo management

- [numtide/devshell](https://github.com/numtide/devshell) - Shell environment for all the tools for this flake.
- [nix-community/nixago](https://github.com/nix-community/nixago) - Repo config file management.
- [berberman/nvfetcher](https://github.com/berberman/nvfetcher) - Source version management.

### Libraries

- [nix-community/haumea](https://github.com/nix-community/haumea) - Filesystem-based module system.
- [nixos/nixos-hardware](https://github.com/nixos/nixos-hardware) - Useful hardware-configuration modules.
- [nabam/nixos-rockchip](https://github.com/nabam/nixos-rockchip) - Useful modules for Rockchip SoCs.
- [nix-community/pyproject.nix](https://github.com/nix-community/pyproject.nix) - Python libraries fetching for certain packages.
- [nix-community/nix-vscode-extensions](https://github.com/nix-community/nix-vscode-extensions) - VSCode extensions management.
- [nix-community/nixos-vscode-server](https://github.com/nix-community/nixos-vscode-server) - VSCode server fixes for NixOS.

### Notable mentions

- [linyinfeng/dotfiles](https://github.com/linyinfeng/dotfiles) - Big inspiration for this flake structure and some library functions.

## Previous configurations

This is a third iteration of repository structure. You can find previous attempts here:
- [divnix/digga](https://github.com/divnix/digga)-based - [truelecter/infra@old-digga-config](https://github.com/truelecter/infra/tree/old-digga-config)
- [divnix/hive](https://github.com/divnix/hive)-based - [truelecter/infra@old-hive-config](https://github.com/truelecter/infra/tree/old-hive-config)
