#!/bin/sh
# Toggle the Home Assistant wall display. Settings: $KU/ha/config.json
# (edit in the Remote web app: Device → Apps).
. ./ku.sh

if running ku-ha; then
    stop_daemon ku-ha # ku-panel brings the Kindle UI back when stopped
    release_awake
    exit 0
fi

# One wall display at a time.
for p in ku-board ku-ha ku-calendar ku-monitor ku-btc; do
    if running "$p"; then stop_daemon "$p"; sleep 2; fi
done
keep_awake 1
start_daemon ku-ha ./bin/ku-panel -mode ha -ku "$KU"
