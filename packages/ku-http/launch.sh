#!/bin/sh
# Toggle the HTTP server.  "settings" toggles the Remote web app on/off.
. ./ku.sh
cfg="$KU/http/config.json"

start() {
    start_daemon ku-http ./bin/ku-httpd -addr :8080 -ku "$KU"
    open_port 8080
    keep_awake 1
}

if [ "$1" = "settings" ]; then
    mkdir -p "$KU/http"
    if [ -f "$cfg" ] && grep -q '"remote": false' "$cfg"; then
        sed -i 's/"remote": false/"remote": true/' "$cfg"
        state="ON"
    elif [ -f "$cfg" ]; then
        sed -i 's/"remote": true/"remote": false/' "$cfg"
        state="OFF"
    else
        echo '{ "remote": false, "ntfy": "" }' >"$cfg"
        state="OFF"
    fi
    if running ku-http; then
        stop_daemon ku-http
        sleep 1
        start
    fi
    [ "$state" = "ON" ] && running ku-http && exit 0 # the server draws its pairing card
    say "Remote web app: $state" "Config: $cfg"
    exit 0
fi

if running ku-http; then
    stop_daemon ku-http
    close_port 8080
    release_awake
    say "HTTP Server is off"
    exit 0
fi

start
# With Remote on, the server draws a QR card to pair your phone.
if grep -q '"remote": false' "$cfg" 2>/dev/null; then
    say "HTTP Server is on" \
        "http://$(wifi_ip):8080" \
        "Files: $KU/www" \
        "Tap HTTP Server again to turn off."
fi
