#!/bin/sh
. ./ku.sh
upgrade_stop ku-btc "$1"
[ "$1" = "upgrade" ] || remove_scriptlet "ku-btc.sh"
