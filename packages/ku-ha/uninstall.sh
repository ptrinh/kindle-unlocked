#!/bin/sh
. ./ku.sh
upgrade_stop ku-ha "$1"
[ "$1" = "upgrade" ] || remove_scriptlet "ku-ha.sh"
