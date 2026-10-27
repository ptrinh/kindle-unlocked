#!/bin/sh
. ./ku.sh
[ "$1" = "upgrade" ] || remove_scriptlet "ku-tailscale.sh"
running tailscaled && ./launch.sh
