#!/bin/sh
. ./kf.sh
running kf-calendar && ./launch.sh
[ "$1" = "upgrade" ] || remove_scriptlet "kf-calendar.sh"
