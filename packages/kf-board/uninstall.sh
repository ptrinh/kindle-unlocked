#!/bin/sh
. ./kf.sh
running kf-board && ./launch.sh
[ "$1" = "upgrade" ] || remove_scriptlet "kf-board.sh"
