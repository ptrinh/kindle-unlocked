#!/bin/sh
# Kindle Unlocked: connects the app store (adds the kindle.trinh.uk/r KPM repo)
# and installs HTTP Server (ku-http), so the Kindle can be managed from a phone.
# Copy this file into the Kindle's "documents" folder, then open it from the Library.
# Log: /mnt/us/ku-setup.log
if [ "$(id -u)" -ne 0 ]; then
  exec /var/local/kmc/bin/su -c "/bin/sh '$0'"
fi
KPM=/var/local/kmc/bin/kpm
FB="/var/local/kmc/bin/fbink -q"
LOG=/mnt/us/ku-setup.log
$FB -c -y 3 -S 3 "Connecting the app store..."
{
  date
  if $KPM list-repo 2>&1 | grep -q "kindle.trinh.uk/r"; then
    echo "Repo already added"
  else
    $KPM -y add-repo https://kindle.trinh.uk/r
  fi
  $KPM -y update
  $KPM list-repo
  # Reinstalling would stop a running server, so only install when missing
  [ -d /mnt/us/kmc/kpm/packages/ku-http ] || $KPM -y install ku-http
} > "$LOG" 2>&1
if grep -q "kindle.trinh.uk/r" "$LOG"; then
  $FB -y 6 -S 3 "Done! Store connected."
  sleep 3
  /usr/bin/xrefresh -d :0.0 2>/dev/null
  # Start HTTP Server: it draws a QR code to pair a phone
  pgrep ku-httpd >/dev/null || $KPM launch ku-http >>"$LOG" 2>&1
else
  $FB -y 6 -S 3 "Failed. See ku-setup.log"
  $FB -y 8 -S 2 "Check Wi-Fi, then open this file again."
  sleep 8
  /usr/bin/xrefresh -d :0.0 2>/dev/null
fi
