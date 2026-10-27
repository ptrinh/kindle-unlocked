#!/bin/sh
# Download the official static ARM build of Tailscale (too big to ship in the package).
. ./ku.sh
dir="$KU/tailscale"
mkdir -p "$dir/bin" "$dir/state"

fetch() { curl -fsSL "$1" 2>/dev/null || wget -qO- "$1"; }

ver=$(fetch "https://pkgs.tailscale.com/stable/?mode=json" | sed -n 's/.*"TarballsVersion": *"\([^"]*\)".*/\1/p')
[ -n "$ver" ] || { echo "Could not reach pkgs.tailscale.com"; exit 1; }

# Older versions unpacked into /tmp, which is a small tmpfs on some Kindles
# (KT2: the 30 MB download filled it). Clear what a failed run left behind.
rm -rf /tmp/ts.tgz /tmp/tailscale_*_arm

if [ "$(cat "$dir/version" 2>/dev/null)" != "$ver" ]; then
    echo "Downloading Tailscale $ver..."
    dl="$dir/download"
    rm -rf "$dl" && mkdir -p "$dl"
    trap 'rm -rf "$dl"' EXIT
    fetch "https://pkgs.tailscale.com/stable/tailscale_${ver}_arm.tgz" >"$dl/ts.tgz" || exit 1
    tar xzf "$dl/ts.tgz" -C "$dl" || exit 1
    cp "$dl/tailscale_${ver}_arm/tailscale" "$dl/tailscale_${ver}_arm/tailscaled" "$dir/bin/" || exit 1
    echo "$ver" >"$dir/version"
fi
chmod +x "$dir/bin/"*
install_scriptlet "ku-tailscale.sh"
