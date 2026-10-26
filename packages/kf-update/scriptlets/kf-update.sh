#!/bin/sh
# Name: Update Apps
# Author: kindle.trinh.uk
# Runs KPM directly (not via "kpm launch") so KPM can update itself and this package.
KPM=/var/local/kmc/bin/kpm
LOG=/mnt/us/unlocked/update.log
mkdir -p /mnt/us/unlocked
eips -c >/dev/null 2>&1
eips 1 2 "Updating apps..." >/dev/null 2>&1
{ date; $KPM update; $KPM upgrade; } >"$LOG" 2>&1
status=$?
eips -c >/dev/null 2>&1
if [ $status -eq 0 ]; then eips 1 2 "Apps are up to date." >/dev/null 2>&1
else eips 1 2 "Update failed - see unlocked/update.log" >/dev/null 2>&1; fi
row=5
tail -n 8 "$LOG" | while IFS= read -r line; do
    eips 1 $row "$(echo "$line" | cut -c1-60)" >/dev/null 2>&1
    row=$((row + 2))
done
