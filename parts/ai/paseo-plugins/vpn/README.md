# vpn

Paseo plugin with a **VPN** screen in the sidebar for [Tunnelblick](https://tunnelblick.net): each VPN configuration with its state and traffic, Connect and Disconnect buttons, and a field for the TOTP code when the server asks for one. It exists for an OpenVPN Access Server that asks for an authenticator code on every fresh login: when the VPN drops away from home, you can bring it back from Paseo (on the desktop or on the phone) without going to the Mac. The OpenVPN Connect app works too, as a fallback, through its debugging port.

macOS only: it drives Tunnelblick through `osascript`, and the package (`pkgs.paseo-plugins.vpn`, `.#paseo-plugin-vpn`) exists only on Darwin systems.

## How the code gets to the server

The server asks for the code after the password. OpenVPN Access Server does that with a `CR_TEXT` prompt while the login is pending (`AUTH_PENDING`, for example "Duo passcode or second factor"); other servers use a static or a dynamic (`CRV1`) challenge. For each of these, Tunnelblick runs a script from the configuration if there is one and sends what it prints: `static-challenge-response.user.sh` for static challenges and `CR_TEXT`, `dynamic-challenge-response.user.sh` for dynamic ones ([Tunnelblick docs](https://tunnelblick.net/cMultiFactorAuthentication.html)). This plugin ships one script for all of them, `tunnelblick/challenge-response.user.sh`, installed under both names:

1. Tunnelblick runs the script as you. The script asks the plugin for a code over the Unix socket `~/.local/share/paseo-vpn/vpn.sock` (only your user can open it) and waits up to 40 seconds.
2. The VPN screen shows **Code needed** with a countdown. The code you send there goes back to the script, and Tunnelblick passes it to the server.
3. With no code in time, or without the plugin running, the script exits with status 3. Tunnelblick then disconnects and offers **Retry** and **Retry with manual response**, so you can still type the code into Tunnelblick on the Mac.

Tunnelblick kills the script after 50 seconds, so it can't wait longer. You can type a code before the server asks for it too: a code entered next to **Connect** is kept for a minute and used by the next challenge straight away.

Status, Connect, and Disconnect use Tunnelblick's AppleScript commands (`state of configurations`, `connect`, `disconnect`; [docs](https://tunnelblick.net/cAppleScriptSupport.html)), so macOS asks once to let Paseo control Tunnelblick. The screen asks for status every 3 seconds, and every second while a code is wanted.

Once connected, OpenVPN reconnects with the session token the server handed out, so short drops don't ask for a code. A new login does, for example after Tunnelblick disconnects for sleep. To keep the connection through sleep, turn off **Disconnect when computer goes to sleep** in the configuration's settings in Tunnelblick.

## OpenVPN Connect fallback

The OpenVPN Connect app has no way to take the code from outside its own window, which is why Tunnelblick is the main path. As a fallback, the plugin drives the app's window over the Chrome DevTools protocol, which the app (an Electron app) offers when started with `--remote-debugging-port=9223`:

- **Start/Restart with remote control** on the screen quits the app and starts it with the port. The app normally relaunches itself and drops extra flags, so the plugin starts the relaunched instance directly (`--relaunch --remote-debugging-port=9223`) and then runs the app once more without flags, which is how a second launch tells the first to open its window; without that, the instance quits after 5 seconds. An open connection in the app drops.
- Status (connection state, profiles, the server's prompt) comes from the app's Redux store, found through React's internals.
- Connect and Disconnect run the app with `--connect-shortcut=<profile id>` and `--disconnect-shortcut`, which OpenVPN [documents as a workaround](https://support.openvpn.com/hc/en-us/articles/41389237225499-OpenVPN-Connect-Workaround-for-CLI-Based-Connect-Disconnect-on-macOS-and-Windows).
- When the app shows its "Multi-factor authentication" dialog, the screen shows **Code needed for OpenVPN Connect**. The code you send is typed into that dialog and its **Send** button pressed (test IDs `OK_btn` and `Cancel_btn`), the same as by hand. A code typed next to Connect beforehand is sent as soon as the dialog opens, while the screen is open.

This depends on the app's internals as of OpenVPN Connect 3.6.0 and can break on an update. While the port is open, any program running as you can control the app, so use Tunnelblick normally. After a login or a normal app start the port is closed again. Don't connect both apps at the same time.

## Setup

1. Install Tunnelblick from [tunnelblick.net](https://tunnelblick.net/downloads.html) into `/Applications`.
2. Put your `.ovpn` profile and the script into a Tunnelblick configuration folder, then open it with Tunnelblick. The folder name becomes the configuration name. Tunnelblick copies it and asks for an administrator password, because a configuration with a script can't be installed silently.

   ```sh
   dir="$(mktemp -d)/vpn-london.tblk/Contents/Resources"
   mkdir -p "$dir"
   cp profile.ovpn "$dir/config.ovpn"
   cp tunnelblick/challenge-response.user.sh "$dir/static-challenge-response.user.sh"
   cp tunnelblick/challenge-response.user.sh "$dir/dynamic-challenge-response.user.sh"
   open -a Tunnelblick "${dir%/Contents/Resources}"
   ```

   The script refers to the socket by its full default path, because Tunnelblick runs it with a fixed environment. After changing the script, install the configuration again (Tunnelblick offers to replace it).
3. Connect once, from Paseo or Tunnelblick. Tunnelblick asks for the username and password; tick the box to save them in the Keychain. Then the code request shows up on the VPN screen.

## Develop

Installed through `programs.paseo.plugins.vpn` (the parts/ai/homeModules/paseo.nix Home Manager module). To work on it without a switch, run `paseo-plugin-dev link vpn` from your checkout: Paseo then loads this folder, `paseo plugin reload vpn` picks up each edit, and `paseo plugin logs vpn` shows its output. `paseo-plugin-dev restore vpn` goes back to the installed build. See `parts/ai/AGENTS.md`.

```sh
nix shell --inputs-from "$(git rev-parse --show-toplevel)" latest#bun \
  -c sh -c 'bun install --frozen-lockfile && bun run typecheck && bun run test'
rm -rf node_modules
nix build .#paseo-plugin-vpn -L
```

The log shows `[vpn] Listening for Tunnelblick challenges on <socket>` after each start. The tests run the real challenge script against the socket server; `PASEO_VPN_WAIT` shortens its wait there and has no effect under Tunnelblick.

## Layout

- `index.server.ts`: RPC handlers for the screen, and the socket server for the challenge script.
- `index.client.tsx`: registers the screen and the sidebar item.
- `shared/vpn.ts`: Zod schemas and RPC contracts.
- `server/challenge.ts`: hands a code typed in Paseo to the waiting script, or keeps it for the next challenge.
- `server/http.ts`: the `POST /challenge` socket endpoint the script calls.
- `server/tunnelblick.ts`: status, connect, and disconnect through `osascript`.
- `server/openvpn-connect.ts`: the OpenVPN Connect fallback over the debugging port.
- `client/vpn-screen.tsx`: the screen.
- `tunnelblick/challenge-response.user.sh`: the script that goes into the Tunnelblick configuration, as `static-challenge-response.user.sh` and `dynamic-challenge-response.user.sh`.
