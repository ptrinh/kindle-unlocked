#!/bin/sh
. ./kf.sh
[ "$1" = "upgrade" ] || remove_scriptlet "kf-ssh.sh"
running kf-ssh && ./launch.sh
