#!/bin/sh
# Toggle the SSH server.
. ./kf.sh

if running kf-ssh; then
    stop_daemon kf-ssh
    close_port 22
    release_awake
    say "SSH is off"
    exit 0
fi

start_daemon kf-ssh ./bin/kf-sshd -addr :22 -dir "$KF/ssh"
open_port 22
keep_awake 1
sleep 1
say "SSH is on" \
    "ssh root@$(wifi_ip)" \
    "Password: $(cat "$KF/ssh/password.txt")" \
    "Keys: $KF/ssh/authorized_keys" \
    "Tap SSH again to turn off."
