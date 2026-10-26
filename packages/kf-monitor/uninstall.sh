#!/bin/sh
. ./kf.sh
running kf-monitor && ./launch.sh
[ "$1" = "upgrade" ] || remove_scriptlet "kf-monitor.sh"
