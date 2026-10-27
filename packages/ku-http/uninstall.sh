#!/bin/sh
. ./ku.sh
running ku-http && ./launch.sh
if [ "$1" != "upgrade" ]; then
    remove_scriptlet "ku-http.sh"
    remove_scriptlet "ku-http-settings.sh"
fi
