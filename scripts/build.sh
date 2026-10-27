#!/bin/sh
# Build the ARMv7 binaries and the KPM repository into public/repo.
set -e
cd "$(dirname "$0")/.."
mkdir -p build
for c in ku-sshd ku-httpd ku-panel; do
    CGO_ENABLED=0 GOOS=linux GOARCH=arm GOARM=7 go build -trimpath -ldflags="-s -w" -o "build/$c" "./cmd/$c"
done
python3 -I scripts/build_repo.py
