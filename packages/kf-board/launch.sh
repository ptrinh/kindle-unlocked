#!/bin/sh
# Toggle the Message Board wall display. Settings: $KF/board/config.json
# (edit in the Remote web app: Device → Apps).
. ./kf.sh

if running kf-board; then
    stop_daemon kf-board # kf-panel brings the Kindle UI back when stopped
    release_awake
    exit 0
fi

# One wall display at a time.
for p in kf-board kf-ha kf-calendar kf-monitor; do
    if running "$p"; then stop_daemon "$p"; sleep 2; fi
done
keep_awake 1
start_daemon kf-board ./bin/kf-panel -mode board -kf "$KF"
