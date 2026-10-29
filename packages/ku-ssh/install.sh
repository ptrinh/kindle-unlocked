#!/bin/sh
. ./ku.sh
chmod +x ./bin/* 2>/dev/null
install_scriptlet "ku-ssh.sh"
upgrade_resume ku-ssh
