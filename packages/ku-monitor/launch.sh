#!/bin/sh
# Toggle the Monitor wall display. Settings: $KU/monitor/config.json
# (edit in the Remote web app: Device → Apps).
. ./ku.sh

if running ku-monitor; then
    stop_daemon ku-monitor # ku-panel brings the Kindle UI back when stopped
    release_awake
    exit 0
fi

# One wall display at a time.
for p in ku-board ku-ha ku-calendar ku-monitor; do
    if running "$p"; then stop_daemon "$p"; sleep 2; fi
done
keep_awake 1
start_daemon ku-monitor ./bin/ku-panel -mode monitor -ku "$KU"
