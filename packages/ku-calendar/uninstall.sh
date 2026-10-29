#!/bin/sh
. ./ku.sh
upgrade_stop ku-calendar "$1"
[ "$1" = "upgrade" ] || remove_scriptlet "ku-calendar.sh"
