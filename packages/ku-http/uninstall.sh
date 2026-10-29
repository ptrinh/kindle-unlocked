#!/bin/sh
. ./ku.sh
upgrade_stop ku-http "$1"
if [ "$1" != "upgrade" ]; then
    remove_scriptlet "ku-http.sh"
    remove_scriptlet "ku-http-settings.sh"
fi
