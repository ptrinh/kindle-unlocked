# Kindle Unlocked

Turn a Kindle into a tiny always-on computer: unlock it from its own browser, then install apps with one line.

**Website:** https://kindle.trinh.uk (English · 中文 · Tiếng Việt)

## How it works

1. **Find your Kindle**: the site reads your serial number and software version, then picks the right unlock method. The live table comes from [kindlemodding.org](https://kindlemodding.org).
2. **Unlock it**: most Kindles from 2019 onwards unlock straight from the Kindle's own browser (SpiderCat, Véra, Sanctuary), with no computer or cable.
3. **Add apps**: in the Kindle search bar:
   ```
   ;kpm add-repo kindle.trinh.uk/r
   ;kpm update
   ;kpm install kf-http
   ```

## Apps

| Package | What it does |
|---|---|
| `kf-http` | **HTTP Server**: hosts a website, plus an optional **Remote** web app for your phone. Remote pairs with a QR code and can show photos, PDFs, notes and drawings on the screen. It also runs a photo frame, sends books, takes screenshots, controls the light, runs scripts, and has an HTTP API. |
| `kf-board` | **Message Board**: family members send notes and photos from `kindle.trinh.uk/b/…` |
| `kf-calendar` | **Calendar**: agenda from iCal links (Google Calendar…) and Todoist tasks |
| `kf-ha` | **Home Assistant**: wall panel showing your entities |
| `kf-monitor` | **Monitor**: uptime checks with history and ntfy alerts |
| `kf-ssh` | SSH + SFTP server |
| `kf-tailscale` | Joins your Tailscale network (userspace networking, so no TUN is needed) |
| `kf-dash` | Always-on web page (demo: `kindle.trinh.uk/d`) |
| `kf-awake` | Keeps the Kindle (and Wi-Fi) awake |
| `kf-update` | One tap to update every app |

**PC Mirror** shows your computer screen on the Kindle. It needs `kf-http` with Remote on.

- Mac: `curl -fsSL kindle.trinh.uk/mirror.sh | bash`
- Windows: `irm kindle.trinh.uk/mirror.ps1 | iex`

## Layout

```
cmd/kf-sshd     SSH/SFTP server (Go)
cmd/kf-httpd    HTTP Server + Remote web app (Go, web/ embedded)
cmd/kf-panel    e-ink panels: board, calendar, ha, monitor (Go)
internal/kindle drawing on the e-ink screen, lipc, framebuffer
packages/       KPM packages (shell hooks + scriptlets); _lib/kf.sh is shared
public/         kindle.trinh.uk static site, board page, mirror scripts
worker/         Cloudflare Worker: /r repo, /d dashboard, /b board, APIs
scripts/        build.sh (ARMv7 binaries + .kpkg repo)
```

## Build & deploy

```
npm install
npm run build    # Go cross-compile (GOARCH=arm GOARM=7) + pack public/repo/*.kpkg
npm run deploy   # build + wrangler deploy
```

Render a panel on your computer to try it:

```
go run ./cmd/kf-panel -mode calendar -kf /tmp/kf -out calendar.png -size 1072x1448
```

## Credits

Unlock methods come from the [KindleModding](https://github.com/KindleModding) community, and packages install through their [KPM](https://github.com/KindleModding/KPM) package manager. Unlocking is at your own risk.

## License

MIT
