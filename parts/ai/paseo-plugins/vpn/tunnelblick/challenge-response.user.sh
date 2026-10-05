#!/bin/bash
# Tunnelblick runs this script, as the logged-in user, when the OpenVPN server asks
# for a second factor (a TOTP or Duo code). It asks the Paseo `vpn` plugin for the
# code and prints it. Tunnelblick sends whatever is printed on stdout, as is.
#
# Install it in the Tunnelblick configuration under both names Tunnelblick looks for:
# static-challenge-response.user.sh (static challenges, and the CR_TEXT prompt that
# OpenVPN Access Server pushes during AUTH_PENDING) and
# dynamic-challenge-response.user.sh (CRV1 dynamic challenges).
#
# Arguments from Tunnelblick: challenge text, configuration name, localized name,
# "echo" or "noecho".
#
# Tunnelblick stops the script after 50 seconds, so the plugin is asked to wait at
# most 40. Exit status 3 makes Tunnelblick disconnect and offer "Retry" and
# "Retry with manual response", with stderr as the message.
#
# Tunnelblick runs scripts with a fixed environment, so PASEO_VPN_WAIT is only set
# by the plugin's tests.

socket="${HOME}/.local/share/paseo-vpn/vpn.sock"
wait="${PASEO_VPN_WAIT:-40}"

if [ ! -S "$socket" ]; then
  echo "The Paseo vpn plugin is not running, so there is nowhere to enter the code." >&2
  exit 3
fi

if ! code="$(/usr/bin/curl --silent --show-error --fail --max-time 45 \
  --unix-socket "$socket" \
  --data-urlencode "config=$2" \
  --data-urlencode "challenge=$1" \
  "http://paseo-vpn/challenge?wait=${wait}" 2>&1)"; then
  echo "Could not ask the Paseo vpn plugin for the code: $code" >&2
  exit 3
fi

if [ -z "$code" ]; then
  echo "No code was entered in Paseo within ${wait} seconds. Enter it on the VPN screen in Paseo and press Connect, or retry here." >&2
  exit 3
fi

printf '%s' "$code"
