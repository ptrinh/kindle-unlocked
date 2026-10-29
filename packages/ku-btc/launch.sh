#!/bin/sh
# Toggle the BTC Ticker wall display. Settings: $KU/btc/config.json
# (edit in the Remote web app: Device → Apps). Tap the price to rotate,
# × to close.
. ./ku.sh

if running ku-btc; then
    stop_daemon ku-btc # ku-panel brings the Kindle UI back when stopped
    release_awake
    exit 0
fi

# One wall display at a time.
for p in ku-board ku-ha ku-calendar ku-monitor ku-btc; do
    if running "$p"; then stop_daemon "$p"; sleep 2; fi
done
keep_awake 1
start_daemon ku-btc ./bin/ku-panel -mode btc -ku "$KU"
