#!/bin/sh
. ./ku.sh
chmod +x ./bin/* 2>/dev/null
install_scriptlet "ku-calendar.sh"
upgrade_resume ku-calendar
