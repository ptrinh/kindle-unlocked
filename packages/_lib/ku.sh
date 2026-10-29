#!/bin/sh
# Shared helpers for kindle.trinh.uk packages. Sourced by hooks and launch scripts.

KU=/mnt/us/unlocked
mkdir -p "$KU"

# say LINE...  - print to the KPM log and draw on the e-ink screen
say() {
    row=2
    eips -c >/dev/null 2>&1
    for line in "$@"; do
        echo "$line"
        eips 1 $row "$line" >/dev/null 2>&1
        row=$((row + 2))
    done
}

wifi_ip() {
    ifconfig wlan0 2>/dev/null | sed -n 's/.*inet addr:\([0-9.]*\).*/\1/p'
}

# Pid-file based daemon control: start_daemon NAME CMD... / stop_daemon NAME / running NAME
start_daemon() {
    name=$1; shift
    "$@" >"$KU/$name.log" 2>&1 &
    echo $! >"$KU/$name.pid"
}

running() {
    [ -f "$KU/$1.pid" ] && kill -0 "$(cat "$KU/$1.pid")" 2>/dev/null
}

stop_daemon() {
    if running "$1"; then kill "$(cat "$KU/$1.pid")" 2>/dev/null; fi
    rm -f "$KU/$1.pid"
}

# The stock firewall drops inbound connections; open/close a TCP port on Wi-Fi.
open_port() {
    iptables -C INPUT -p tcp --dport "$1" -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport "$1" -j ACCEPT
}

close_port() {
    iptables -D INPUT -p tcp --dport "$1" -j ACCEPT 2>/dev/null
}

keep_awake() {
    lipc-set-prop com.lab126.powerd preventScreenSaver "$1" 2>/dev/null
}

# install_scriptlet FILE / remove_scriptlet FILE - only remove our own copy
install_scriptlet() {
    # Copy then rename, so a scriptlet that is running right now (Update Apps
    # updating itself) keeps reading its old file.
    cp "scriptlets/$1" "/mnt/us/documents/.$1.tmp" && mv -f "/mnt/us/documents/.$1.tmp" "/mnt/us/documents/$1"
}

remove_scriptlet() {
    if [ -f "/mnt/us/documents/$1" ] && [ "$(md5sum <"/mnt/us/documents/$1")" = "$(md5sum <"scriptlets/$1")" ]; then
        rm -f "/mnt/us/documents/$1"
    fi
}

# Services keep the Kindle awake (Wi-Fi sleeps with the screen). Only let it
# sleep again once none of them is running.
release_awake() {
    for s in ku-ssh ku-http tailscaled ku-board ku-ha ku-calendar ku-monitor ku-btc; do running "$s" && return; done
    [ -f "$KU/dash.on" ] && return
    [ -f "$KU/awake.on" ] && return
    keep_awake 0
}

# KPM upgrades run the old package's uninstall hook, then the new one's
# install hook. upgrade_stop NAME "$1" stops a running app (pid name NAME) and,
# on an upgrade, upgrade_resume NAME starts it again, so Update Apps doesn't
# leave wall displays and servers off.
upgrade_stop() {
    running "$1" || return 0
    [ "$2" = "upgrade" ] && touch "$KU/$1.resume"
    ./launch.sh
}

upgrade_resume() {
    [ -f "$KU/$1.resume" ] || return 0
    rm -f "$KU/$1.resume"
    # In the background: some launch scripts wait for the network.
    ./launch.sh >/dev/null 2>&1 &
}
