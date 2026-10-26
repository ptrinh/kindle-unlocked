#!/bin/sh
. ./kf.sh
running kf-http && ./launch.sh
if [ "$1" != "upgrade" ]; then
    remove_scriptlet "kf-http.sh"
    remove_scriptlet "kf-http-settings.sh"
fi
