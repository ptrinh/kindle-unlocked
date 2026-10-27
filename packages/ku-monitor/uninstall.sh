#!/bin/sh
. ./ku.sh
running ku-monitor && ./launch.sh
[ "$1" = "upgrade" ] || remove_scriptlet "ku-monitor.sh"
