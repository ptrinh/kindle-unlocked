#!/bin/sh
# Open the dashboard page in the browser and keep the screen on.
# The page comes from $KU/dash/url.txt (default: the demo dashboard).
. ./ku.sh

mkdir -p "$KU/dash"
[ -f "$KU/dash/url.txt" ] || echo "https://kindle.trinh.uk/d" >"$KU/dash/url.txt"
url=$(head -n 1 "$KU/dash/url.txt")

if [ -f "$KU/dash.on" ] && [ "$1" != "on" ]; then
    rm -f "$KU/dash.on"
    release_awake
    lipc-set-prop com.lab126.appmgrd start app://com.lab126.booklet.home
    exit 0
fi

touch "$KU/dash.on"
keep_awake 1
lipc-set-prop com.lab126.appmgrd start "app://com.lab126.browser?view=$url"
