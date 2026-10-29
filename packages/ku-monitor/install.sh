#!/bin/sh
. ./ku.sh
chmod +x ./bin/* 2>/dev/null
install_scriptlet "ku-monitor.sh"
upgrade_resume ku-monitor
