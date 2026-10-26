#!/bin/sh
# Download the official static ARM build of Tailscale (too big to ship in the package).
. ./kf.sh
dir="$KF/tailscale"
mkdir -p "$dir/bin" "$dir/state"

fetch() { curl -fsSL "$1" 2>/dev/null || wget -qO- "$1"; }

ver=$(fetch "https://pkgs.tailscale.com/stable/?mode=json" | sed -n 's/.*"TarballsVersion": *"\([^"]*\)".*/\1/p')
[ -n "$ver" ] || { echo "Could not reach pkgs.tailscale.com"; exit 1; }

if [ "$(cat "$dir/version" 2>/dev/null)" != "$ver" ]; then
    echo "Downloading Tailscale $ver..."
    fetch "https://pkgs.tailscale.com/stable/tailscale_${ver}_arm.tgz" >/tmp/ts.tgz || exit 1
    tar xzf /tmp/ts.tgz -C /tmp || exit 1
    cp "/tmp/tailscale_${ver}_arm/tailscale" "/tmp/tailscale_${ver}_arm/tailscaled" "$dir/bin/" || exit 1
    rm -rf /tmp/ts.tgz "/tmp/tailscale_${ver}_arm"
    echo "$ver" >"$dir/version"
fi
chmod +x "$dir/bin/"*
install_scriptlet "kf-tailscale.sh"
