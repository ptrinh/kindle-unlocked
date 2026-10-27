#!/bin/sh
. ./ku.sh
running ku-board && ./launch.sh
[ "$1" = "upgrade" ] || remove_scriptlet "ku-board.sh"
