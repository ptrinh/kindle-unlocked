#!/bin/sh
. ./ku.sh
upgrade_stop ku-board "$1"
[ "$1" = "upgrade" ] || remove_scriptlet "ku-board.sh"
