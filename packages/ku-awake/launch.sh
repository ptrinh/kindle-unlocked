#!/bin/sh
# Toggle "never sleep".
. ./ku.sh

if [ -f "$KU/awake.on" ]; then
    rm -f "$KU/awake.on"
    release_awake
    say "Sleep allowed again"
else
    touch "$KU/awake.on"
    keep_awake 1
    say "Kindle will stay awake" "Tap Stay Awake again to undo."
fi
