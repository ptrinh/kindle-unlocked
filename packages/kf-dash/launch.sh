#!/bin/sh
# Open the dashboard page in the browser and keep the screen on.
# The page comes from $KF/dash/url.txt (default: the demo dashboard).
. ./kf.sh

mkdir -p "$KF/dash"
[ -f "$KF/dash/url.txt" ] || echo "https://kindle.trinh.uk/d" >"$KF/dash/url.txt"
url=$(head -n 1 "$KF/dash/url.txt")

if [ -f "$KF/dash.on" ] && [ "$1" != "on" ]; then
    rm -f "$KF/dash.on"
    release_awake
    lipc-set-prop com.lab126.appmgrd start app://com.lab126.booklet.home
    exit 0
fi

touch "$KF/dash.on"
keep_awake 1
lipc-set-prop com.lab126.appmgrd start "app://com.lab126.browser?view=$url"
