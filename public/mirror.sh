#!/bin/bash
# Kindle Mirror for Mac — show your Mac's screen (or part of it) on your Kindle.
#
# Needs the HTTP Server app on the Kindle with Remote on. Get the address and
# token from the Remote web app: Device → "API token + examples".
#
#   curl -fsSL https://kindle.trinh.uk/mirror.sh | bash
#   bash mirror.sh <kindle-address> <token> [x,y,w,h] [seconds]
#
# The first run asks macOS for Screen Recording permission for your terminal.
set -euo pipefail

KINDLE="${1:-}"
TOKEN="${2:-}"
REGION="${3:-}"
EVERY="${4:-2}"

if [ -z "$KINDLE" ]; then read -rp "Kindle address (e.g. 192.168.1.20:8080): " KINDLE </dev/tty; fi
if [ -z "$TOKEN" ]; then read -rsp "API token: " TOKEN </dev/tty; echo; fi
if [ -z "$REGION" ] && [ -e /dev/tty ]; then
    read -rp "Region x,y,w,h (Enter = whole screen): " REGION </dev/tty || true
fi
case "$KINDLE" in http*) ;; *) KINDLE="http://$KINDLE" ;; esac
case "$KINDLE" in *:[0-9]*) ;; *) KINDLE="$KINDLE:8080" ;; esac

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"; echo; echo "Stopped."' EXIT
SHOT="$TMP/shot.png"
last=""
n=0

curl -fsS -H "Authorization: Bearer $TOKEN" "$KINDLE/api/status" >/dev/null || {
    echo "Can't reach the Kindle at $KINDLE (is HTTP Server on, with Remote enabled?)"; exit 1; }
echo "Mirroring to $KINDLE every ${EVERY}s — Ctrl+C to stop."

while true; do
    if [ -n "$REGION" ]; then screencapture -x -R"$REGION" -t png "$SHOT"; else screencapture -x -m -t png "$SHOT"; fi
    sips -Z 1600 "$SHOT" >/dev/null 2>&1 || true # e-ink panels are ~1.5k px; smaller uploads are faster
    sum=$(md5 -q "$SHOT")
    if [ "$sum" != "$last" ]; then
        last=$sum
        # Partial refreshes are quick; every 15th frame does a full one to clear ghosting.
        fast=1; [ $((n % 15)) -eq 0 ] && fast=0
        curl -fsS -o /dev/null -H "Authorization: Bearer $TOKEN" --data-binary @"$SHOT" \
            "$KINDLE/api/show?hold=1&fast=$fast" && printf "." || printf "x"
        n=$((n + 1))
    fi
    sleep "$EVERY"
done
