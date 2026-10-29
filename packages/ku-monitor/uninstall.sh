#!/bin/sh
. ./ku.sh
upgrade_stop ku-monitor "$1"
[ "$1" = "upgrade" ] || remove_scriptlet "ku-monitor.sh"
