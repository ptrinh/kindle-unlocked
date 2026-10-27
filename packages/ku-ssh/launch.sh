#!/bin/sh
# Toggle the SSH server.
. ./ku.sh

if running ku-ssh; then
    stop_daemon ku-ssh
    close_port 22
    release_awake
    say "SSH is off"
    exit 0
fi

start_daemon ku-ssh ./bin/ku-sshd -addr :22 -dir "$KU/ssh"
open_port 22
keep_awake 1
sleep 1
say "SSH is on" \
    "ssh root@$(wifi_ip)" \
    "Password: $(cat "$KU/ssh/password.txt")" \
    "Keys: $KU/ssh/authorized_keys" \
    "Tap SSH again to turn off."
