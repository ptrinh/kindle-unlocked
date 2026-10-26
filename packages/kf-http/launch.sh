#!/bin/sh
# Toggle the HTTP server.  "settings" toggles the Remote web app on/off.
. ./kf.sh
cfg="$KF/http/config.json"

start() {
    start_daemon kf-http ./bin/kf-httpd -addr :8080 -kf "$KF"
    open_port 8080
    keep_awake 1
}

if [ "$1" = "settings" ]; then
    mkdir -p "$KF/http"
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
    if running kf-http; then
        stop_daemon kf-http
        sleep 1
        start
    fi
    [ "$state" = "ON" ] && running kf-http && exit 0 # the server draws its pairing card
    say "Remote web app: $state" "Config: $cfg"
    exit 0
fi

if running kf-http; then
    stop_daemon kf-http
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
        "Files: $KF/www" \
        "Tap HTTP Server again to turn off."
fi
