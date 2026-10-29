#!/bin/sh
. ./ku.sh
[ "$1" = "upgrade" ] || remove_scriptlet "ku-ssh.sh"
upgrade_stop ku-ssh "$1"
