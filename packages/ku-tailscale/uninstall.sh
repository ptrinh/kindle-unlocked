#!/bin/sh
. ./ku.sh
[ "$1" = "upgrade" ] || remove_scriptlet "ku-tailscale.sh"
upgrade_stop tailscaled "$1"
