#!/bin/sh
. ./kf.sh
[ "$1" = "upgrade" ] || remove_scriptlet "kf-tailscale.sh"
running tailscaled && ./launch.sh
