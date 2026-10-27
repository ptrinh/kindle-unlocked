#!/bin/sh
. ./ku.sh
running ku-ha && ./launch.sh
[ "$1" = "upgrade" ] || remove_scriptlet "ku-ha.sh"
