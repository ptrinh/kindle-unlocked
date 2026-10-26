#!/bin/sh
# Toggle Tailscale. First run shows a login link; or put an auth key in
# /mnt/us/unlocked/tailscale/authkey.txt to log in without one.
. ./kf.sh
dir="$KF/tailscale"
sock=/tmp/kf-tailscaled.sock
ts() { "$dir/bin/tailscale" --socket=$sock "$@"; }

if running tailscaled; then
    ts down >/dev/null 2>&1
    stop_daemon tailscaled
    release_awake
    say "Tailscale is off"
    exit 0
fi

# Userspace networking works on every Kindle (many lack /dev/net/tun).
# Apps on the Kindle can reach the tailnet via SOCKS5 localhost:1055.
start_daemon tailscaled "$dir/bin/tailscaled" --tun=userspace-networking \
    --statedir="$dir/state" --socket=$sock \
    --socks5-server=localhost:1055 --outbound-http-proxy-listen=localhost:1056
keep_awake 1
sleep 3

key=$(cat "$dir/authkey.txt" 2>/dev/null)
ts up --hostname=kindle ${key:+--auth-key=$key} >"$KF/tailscale-up.log" 2>&1 &

# Wait up to 5 minutes: show the login link if needed, then the address.
shown=""
i=0
while [ $i -lt 150 ]; do
    ip=$(ts ip -4 2>/dev/null)
    if [ -n "$ip" ]; then
        say "Tailscale is on" "Address: $ip" "ssh root@$ip  (with SSH on)" "Tap Tailscale again to turn off."
        exit 0
    fi
    link=$(grep -o 'https://login.tailscale.com/[^ ]*' "$KF/tailscale-up.log" | head -n 1)
    if [ -n "$link" ] && [ "$link" != "$shown" ]; then
        say "Log in to Tailscale" "Open this link on your phone:" "$link"
        shown=$link
    fi
    i=$((i + 1))
    sleep 2
done
say "Tailscale: still waiting" "Tap Tailscale to stop, then try again."
