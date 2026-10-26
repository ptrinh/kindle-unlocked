#!/usr/bin/env python3
"""Pack packages/kf-* into .kpkg files and write the KPM repo manifest.

Output goes to public/repo/. Binaries come from build/ (see scripts/build.sh).
"""
import io
import json
import os
import tarfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKGS = os.path.join(ROOT, "packages")
OUT = os.path.join(ROOT, "public", "repo")
BASE_URL = "https://kindle.trinh.uk/repo/"
BINARIES = {
    "kf-ssh": ["kf-sshd"],
    "kf-http": ["kf-httpd"],
    "kf-board": ["kf-panel"],
    "kf-ha": ["kf-panel"],
    "kf-calendar": ["kf-panel"],
    "kf-monitor": ["kf-panel"],
}


def add(tar, arcname, data, exe=False):
    info = tarfile.TarInfo(arcname)
    info.size = len(data)
    info.mode = 0o755 if exe else 0o644
    tar.addfile(info, io.BytesIO(data))


def read(path):
    with open(path, "rb") as f:
        return f.read()


def pack(pkg_id):
    src = os.path.join(PKGS, pkg_id)
    manifest = json.load(open(os.path.join(src, "manifest.json")))
    version = ".".join(map(str, manifest["version"]))
    platforms = manifest["supported_platforms"]
    filename = f"{pkg_id}_{version}_{'-'.join(platforms)}.kpkg"

    with tarfile.open(os.path.join(OUT, filename), "w:gz", compresslevel=9) as tar:
        for dirpath, _, files in os.walk(src):
            for name in sorted(files):
                path = os.path.join(dirpath, name)
                rel = os.path.relpath(path, src)
                add(tar, rel, read(path), exe=name.endswith(".sh"))
        add(tar, "kf.sh", read(os.path.join(PKGS, "_lib", "kf.sh")), exe=True)
        for b in BINARIES.get(pkg_id, []):
            add(tar, f"bin/{b}", read(os.path.join(ROOT, "build", b)), exe=True)

    return manifest, {
        "url": BASE_URL + filename,
        "version": manifest["version"],
        "dependencies": manifest["dependencies"],
        "supported_platforms": platforms,
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith(".kpkg"):
            os.remove(os.path.join(OUT, f))

    repo = {
        "manifest_version": 2,
        "id": "unlocked",
        "name": "Kindle Unlocked",
        "description": "Apps from kindle.trinh.uk",
        "packages": {},
    }
    for pkg_id in sorted(os.listdir(PKGS)):
        if not pkg_id.startswith("kf-"):
            continue
        manifest, artifact = pack(pkg_id)
        repo["packages"][pkg_id] = {
            "name": manifest["name"],
            "author": manifest["author"],
            "description": manifest["description"],
            "artifacts": [artifact],
        }
        print(f"packed {artifact['url']}")

    with open(os.path.join(OUT, "manifest.v2.json"), "w") as f:
        json.dump(repo, f, indent=2)


if __name__ == "__main__":
    main()
