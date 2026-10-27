package main

// Settings, "Kindle is online" notifications, the pairing card drawn on the
// e-ink screen, and the app icon.

import (
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	qrcode "github.com/skip2/go-qrcode"
	"golang.org/x/image/font"
	"golang.org/x/image/font/basicfont"
	"golang.org/x/image/math/fixed"
)

var execCommand = exec.Command

/* ---------- settings ---------- */

type Settings struct {
	Remote bool   `json:"remote"` // serve the Remote web app (else just the website)
	Ntfy   string `json:"ntfy"`   // e.g. https://ntfy.sh/my-secret-topic
}

var (
	settingsMu sync.Mutex
	settings   = Settings{Remote: true}
)

func settingsPath() string { return filepath.Join(dataDir, "config.json") }

func loadSettings() {
	b, err := os.ReadFile(settingsPath())
	if err != nil {
		saveSettings(settings) // write the defaults so the file is easy to find and edit
		return
	}
	json.Unmarshal(b, &settings)
}

func getSettings() Settings {
	settingsMu.Lock()
	defer settingsMu.Unlock()
	return settings
}

func saveSettings(s Settings) error {
	settingsMu.Lock()
	settings = s
	settingsMu.Unlock()
	b, _ := json.MarshalIndent(s, "", "  ")
	return os.WriteFile(settingsPath(), b, 0600)
}

/* ---------- notifications (ntfy) ---------- */

func remoteURL() string {
	if ip := wifiIP(); ip != "" {
		return "http://" + ip + ":" + port
	}
	return ""
}

func notify(title, body string) error {
	u := getSettings().Ntfy
	if u == "" {
		return fmt.Errorf("no notification address set")
	}
	req, err := http.NewRequest("POST", u, strings.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Title", title)
	req.Header.Set("Tags", "books")
	if link := remoteURL(); link != "" {
		req.Header.Set("Click", link)
	}
	c := &http.Client{Timeout: 15 * time.Second}
	res, err := c.Do(req)
	if err != nil {
		return err
	}
	res.Body.Close()
	if res.StatusCode >= 300 {
		return fmt.Errorf("ntfy: %s", res.Status)
	}
	return nil
}

// watchOnline pings you whenever the Kindle (re)joins Wi-Fi.
func watchOnline() {
	last := ""
	for {
		ip := wifiIP()
		if ip != "" && ip != last {
			body := "Open " + remoteURL()
			if ts := tailnetIP(); ts != "" {
				body += "\nTailscale: http://" + ts + ":" + port
			}
			if notify("Kindle is online", body) == nil || getSettings().Ntfy == "" {
				last = ip
			}
		}
		if ip == "" {
			last = ""
		}
		time.Sleep(30 * time.Second)
	}
}

/* ---------- pairing card ---------- */

// showCard paints "scan to connect" with a QR code that pairs the phone in one go.
func showCard() error {
	w, h := screenSize()
	img := image.NewGray(image.Rect(0, 0, w, h))
	draw.Draw(img, img.Bounds(), image.White, image.Point{}, draw.Src)

	// Text scales: as large as fits the width, capped by the screen height so
	// the whole card (title, QR, hints, PIN) fits on small panels like 600x800.
	body := fitScale("Scan with your phone camera", w*9/10, h/60)
	title := fitScale("Kindle Remote", w*8/10, h/30)
	y := h / 16
	drawText(img, "Kindle Remote", w/2, y, title, true)
	y += 13*title + h/24

	ip := wifiIP()
	if ip == "" {
		drawText(img, "Connect to Wi-Fi first,", w/2, y, body, true)
		drawText(img, "then tap Remote again.", w/2, y+body*20, body, true)
		return showImage(img)
	}

	link := fmt.Sprintf("http://%s:%s/pair?pin=%s", ip, port, pin)
	q, err := qrcode.New(link, qrcode.Medium)
	if err != nil {
		return err
	}
	q.DisableBorder = true
	size := min(w*6/10, h*45/100)
	qr := q.Image(size)
	draw.Draw(img, image.Rect((w-size)/2, y, (w+size)/2, y+size), qr, image.Point{}, draw.Src)
	y += size + h/24

	drawText(img, "Scan with your phone camera", w/2, y, body, true)
	y += 13*body + h/60
	url := "or open " + remoteURL()
	drawText(img, url, w/2, y, fitScale(url, w*9/10, body), true)
	y += 13*body + h/30
	drawText(img, "PIN  "+pin, w/2, y, fitScale("PIN  "+pin, w*8/10, body*2), true)
	return showImage(img)
}

// fitScale returns the largest scale up to want at which s fits in maxW pixels.
func fitScale(s string, maxW, want int) int {
	width := font.MeasureString(basicfont.Face7x13, s).Ceil()
	return max(1, min(want, maxW/max(width, 1)))
}

// drawText renders s with the 7x13 bitmap font, scaled up by `scale`.
func drawText(dst *image.Gray, s string, x, y, scale int, center bool) {
	face := basicfont.Face7x13
	width := font.MeasureString(face, s).Ceil()
	small := image.NewGray(image.Rect(0, 0, width, 13))
	draw.Draw(small, small.Bounds(), image.White, image.Point{}, draw.Src)
	d := &font.Drawer{Dst: small, Src: image.Black, Face: face, Dot: fixed.P(0, 10)}
	d.DrawString(s)
	if center {
		x -= width * scale / 2
	}
	for sy := 0; sy < 13; sy++ {
		for sx := 0; sx < width; sx++ {
			if small.GrayAt(sx, sy).Y < 128 {
				r := image.Rect(x+sx*scale, y+sy*scale, x+(sx+1)*scale, y+(sy+1)*scale)
				draw.Draw(dst, r, image.Black, image.Point{}, draw.Src)
			}
		}
	}
}

/* ---------- icon ---------- */

// iconHandler draws the home-screen icon: a white Kindle on black.
func iconHandler(w http.ResponseWriter, r *http.Request) {
	size, _ := strconv.Atoi(strings.TrimSuffix(r.PathValue("file"), ".png"))
	if size < 32 || size > 1024 {
		size = 512
	}
	img := image.NewRGBA(image.Rect(0, 0, size, size))
	draw.Draw(img, img.Bounds(), image.Black, image.Point{}, draw.Src)
	white := image.NewUniform(color.RGBA{245, 245, 247, 255})
	f := func(v float64) int { return int(v * float64(size)) }
	draw.Draw(img, image.Rect(f(.25), f(.14), f(.75), f(.86)), white, image.Point{}, draw.Src)
	draw.Draw(img, image.Rect(f(.31), f(.22), f(.69), f(.70)), image.Black, image.Point{}, draw.Src)
	for i := 0; i < 3; i++ { // text lines on the "page"
		yy := f(.30 + float64(i)*.1)
		draw.Draw(img, image.Rect(f(.36), yy, f(.64-float64(i)*.06), yy+f(.03)), white, image.Point{}, draw.Src)
	}
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	png.Encode(w, img)
}
