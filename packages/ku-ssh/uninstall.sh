#!/bin/sh
. ./ku.sh
[ "$1" = "upgrade" ] || remove_scriptlet "ku-ssh.sh"
running ku-ssh && ./launch.sh
