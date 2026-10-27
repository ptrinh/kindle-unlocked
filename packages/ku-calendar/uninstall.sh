#!/bin/sh
. ./ku.sh
running ku-calendar && ./launch.sh
[ "$1" = "upgrade" ] || remove_scriptlet "ku-calendar.sh"
