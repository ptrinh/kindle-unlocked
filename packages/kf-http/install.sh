#!/bin/sh
. ./kf.sh
chmod +x ./bin/* 2>/dev/null
install_scriptlet "kf-http.sh"
install_scriptlet "kf-http-settings.sh"
