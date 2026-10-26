#!/bin/sh
. ./kf.sh
[ "$1" = "upgrade" ] || remove_scriptlet "kf-update.sh"
