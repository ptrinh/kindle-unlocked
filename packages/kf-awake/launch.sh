#!/bin/sh
# Toggle "never sleep".
. ./kf.sh

if [ -f "$KF/awake.on" ]; then
    rm -f "$KF/awake.on"
    release_awake
    say "Sleep allowed again"
else
    touch "$KF/awake.on"
    keep_awake 1
    say "Kindle will stay awake" "Tap Stay Awake again to undo."
fi
