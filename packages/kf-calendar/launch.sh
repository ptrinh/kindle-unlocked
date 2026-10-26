#!/bin/sh
# Toggle the Calendar wall display. Settings: $KF/calendar/config.json
# (edit in the Remote web app: Device → Apps).
. ./kf.sh

if running kf-calendar; then
    stop_daemon kf-calendar # kf-panel brings the Kindle UI back when stopped
    release_awake
    exit 0
fi

# One wall display at a time.
for p in kf-board kf-ha kf-calendar kf-monitor; do
    if running "$p"; then stop_daemon "$p"; sleep 2; fi
done
keep_awake 1
start_daemon kf-calendar ./bin/kf-panel -mode calendar -kf "$KF"
