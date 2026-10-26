#!/bin/sh
. ./kf.sh
running kf-ha && ./launch.sh
[ "$1" = "upgrade" ] || remove_scriptlet "kf-ha.sh"
