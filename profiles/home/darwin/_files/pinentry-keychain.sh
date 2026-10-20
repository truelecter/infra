#!/bin/bash
# pinentry-keychain: answer the OpenPGP card (YubiKey) user-PIN prompt from the
# macOS Keychain, without any dialog. The PIN is looked up per card:
#
#   security add-generic-password -s gpg-card-pin -a <card serial> -T /usr/bin/security -U -w
#
# Every other prompt (Admin PIN, new PIN, key passphrases, a retry after a bad
# PIN, a card with no Keychain item) is handed to a real pinentry.
#
#   PINENTRY_KEYCHAIN_SERVICE   Keychain service name, default gpg-card-pin
#   PINENTRY_KEYCHAIN_FALLBACK  real pinentry, default pinentry-mac on PATH
#
# /bin/bash on macOS is 3.2: no `set -u` (empty arrays count as unset there).

service=${PINENTRY_KEYCHAIN_SERVICE:-gpg-card-pin}
fallback=${PINENTRY_KEYCHAIN_FALLBACK:-pinentry-mac}

seen=() # one-line-reply commands answered so far, replayed to the fallback
desc='' prompt='' had_error=0 answered=0

# Assuan data lines must escape %, CR and LF.
encode() {
  local s=${1//\%/%25}
  s=${s//$'\r'/%0D}
  printf '%s' "${s//$'\n'/%0A}"
}

# Prints the card serial from "...Number: 32 898 543%0AHolder: ..." if this is
# a first try at the card's user PIN.
card_serial() {
  [[ $answered == 0 && $had_error == 0 ]] || return 1
  # scdaemon adds "Remaining attempts" once a try failed: never burn a second one.
  [[ $prompt == *Admin* || $desc == *Admin* || $desc == *New* || $desc == *Reset* || $desc == *"Remaining attempts"* ]] && return 1
  [[ $desc == *"unlock the card"* && $desc == *"Number: "* ]] || return 1
  local n=${desc#*Number: }
  n=${n%%\%0A*}
  n=${n//[^0-9]/}
  [[ -n $n ]] && printf '%s' "$n"
}

# Replay the session to the real pinentry, drop the replies gpg-agent already
# got (greeting + one OK per replayed command), then proxy the rest.
#
# The fallback runs as the only process of a background job, and the script
# quits as soon as it does, so gpg-agent sees EOF instead of waiting forever for
# a reply from a pinentry that died. The feeder and the filter are process
# substitutions: `wait` on a pipeline would also wait for the feeder, which only
# ends when gpg-agent closes our stdin. `wait` also lets the INT/TERM trap run,
# which is how gpg-agent cancels a pinentry (GETINFO pid reports this script).
# Async commands get /dev/null as stdin, so the feeder reads a copy on fd 3.
hand_off() {
  local skip=$((${#seen[@]} + 1)) fallback_pid=
  trap '[[ -n $fallback_pid ]] && kill "$fallback_pid" 2>/dev/null; exit 1' INT TERM
  exec 3<&0
  "$fallback" \
    < <(
      for c in "${seen[@]}"; do printf '%s\n' "$c"; done
      printf '%s\n' "$1"
      exec cat <&3
    ) \
    > >(awk -v skip="$skip" 'NR > skip { print; fflush() }') \
    3<&- &
  fallback_pid=$!
  wait "$fallback_pid"
  exit
}

echo 'OK pinentry-keychain ready'
while IFS= read -r line; do
  cmd=${line%% *}
  arg=${line#"$cmd"}
  arg=${arg# }
  case $cmd in
  SETDESC) desc=$arg ;;
  SETPROMPT) prompt=$arg ;;
  SETERROR) had_error=1 ;;
  GETINFO)
    [[ $arg == pid ]] && echo "D $$"
    echo OK
    continue
    ;;
  GETPIN)
    if serial=$(card_serial) &&
      pin=$(/usr/bin/security find-generic-password -s "$service" -a "$serial" -w 2>/dev/null) &&
      [[ -n $pin ]]; then
      answered=1
      printf 'D %s\n' "$(encode "$pin")"
      unset pin
      echo OK
      continue
    fi
    hand_off "$line"
    ;;
  CONFIRM | MESSAGE) hand_off "$line" ;;
  BYE)
    echo OK
    exit 0
    ;;
  esac
  echo OK
  seen+=("$line")
done
