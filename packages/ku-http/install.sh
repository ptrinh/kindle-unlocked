#!/bin/sh
. ./ku.sh
chmod +x ./bin/* 2>/dev/null
install_scriptlet "ku-http.sh"
install_scriptlet "ku-http-settings.sh"
upgrade_resume ku-http
