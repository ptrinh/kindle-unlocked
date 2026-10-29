// ku-panel: always-on e-ink panels for a Kindle.
//
//	ku-panel -mode board     family message board (messages via kindle.trinh.uk/b/…)
//	ku-panel -mode ha        Home Assistant entities
//	ku-panel -mode calendar  agenda from iCal links + Todoist tasks
//	ku-panel -mode monitor   uptime checks for websites and servers
//	ku-panel -mode btc       Bitcoin ticker (tap the price to rotate)
//
// Each mode reads <ku>/<mode>/config.json (created with defaults on first run,
// re-read every cycle so edits apply without a restart).
package main

import (
	"crypto/sha256"
	"encoding/json"
	"flag"
	"fmt"
	"image"
	"image/png"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"runtime/debug"
	"syscall"
	"time"
	_ "time/tzdata"

	"kindle.trinh.uk/unlocked/internal/kindle"
)

type panel interface {
	// defaults returns the config written on first run.
	defaults() any
	// render draws the panel; it returns how long to wait before the next one.
	render(c *Canvas, cfgPath string) (time.Duration, error)
}

var panels = map[string]func() panel{
	"board":    func() panel { return &board{} },
	"ha":       func() panel { return &homeAssistant{} },
	"calendar": func() panel { return &calendar{} },
	"monitor":  func() panel { return &monitor{} },
	"btc":      func() panel { return &btcTicker{} },
}

// Optional panel features.
type (
	ownFonts interface {
		typefaces(cfgPath string) (reg, bold *Typeface)
	}
	// rotator chooses landscape or portrait from its config.
	rotator interface{ landscape(cfgPath string) bool }
	// refresher flashes the screen on a timer instead of every 10th update.
	refresher interface{ fullRefresh() time.Duration }
)

var (
	kuDir     string
	panelMode string
	client    = &http.Client{Timeout: 20 * time.Second}
)

func main() {
	mode := flag.String("mode", "board", "board | ha | calendar | monitor | btc")
	flag.StringVar(&kuDir, "ku", "/mnt/us/unlocked", "data folder")
	out := flag.String("out", "", "render once into this PNG (for testing) instead of the screen")
	size := flag.String("size", "", "screen size WxH (default: detect)")
	flag.Parse()

	panelMode = *mode
	mk, ok := panels[*mode]
	if !ok {
		log.Fatalf("unknown mode %q", *mode)
	}
	p := mk()
	dir := filepath.Join(kuDir, *mode)
	os.MkdirAll(dir, 0755)
	cfgPath := filepath.Join(dir, "config.json")
	if _, err := os.Stat(cfgPath); os.IsNotExist(err) {
		b, _ := json.MarshalIndent(p.defaults(), "", "  ")
		os.WriteFile(cfgPath, append(b, '\n'), 0644)
	}

	w, h := kindle.ScreenSize()
	if *size != "" {
		fmt.Sscanf(*size, "%dx%d", &w, &h)
	}
	var reg, bold *Typeface
	if of, ok := p.(ownFonts); ok {
		reg, bold = of.typefaces(cfgPath)
	} else {
		reg, bold = loadTypefaces(kuDir)
	}
	// Panels run for months: keep the heap small and return memory early.
	debug.SetMemoryLimit(48 << 20)
	debug.SetGCPercent(50)

	// canvasSize is the screen, turned sideways when the panel wants the other orientation.
	canvasSize := func() (int, int) {
		if r, ok := p.(rotator); ok && r.landscape(cfgPath) != (w > h) {
			return h, w
		}
		return w, h
	}

	if *out != "" {
		cw, ch := canvasSize()
		c := NewCanvas(cw, ch, reg, bold)
		if _, err := p.render(c, cfgPath); err != nil {
			errorScreen(c, err)
		}
		f, err := os.Create(*out)
		if err != nil {
			log.Fatal(err)
		}
		defer f.Close()
		png.Encode(f, c.Gray)
		return
	}

	// Wall-display mode: pause the stock UI so nothing paints over us.
	kindle.SetAwake(true)
	kindle.SetUIPaused(true)
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)
	go func() {
		<-stop
		kindle.SetUIPaused(false)
		os.Exit(0)
	}()
	time.Sleep(2 * time.Second)

	taps := make(chan image.Point, 1)
	if _, ok := p.(tapper); ok {
		go readTaps(w, h, taps)
	}

	var last [32]byte
	var c *Canvas
	var lastFull time.Time
	updates := 0
	shot := filepath.Join(os.TempDir(), "ku-panel.png")
	for {
		cw, ch := canvasSize()
		full := false
		if c == nil || c.W != cw || c.H != ch {
			c, full = NewCanvas(cw, ch, reg, bold), true
		} else {
			c.Clear()
		}
		wait, err := safeRender(p, c, cfgPath)
		if err != nil {
			c.Clear()
			errorScreen(c, err)
			wait = time.Minute
		}
		if sum := sha256.Sum256(c.Pix); sum != last {
			last = sum
			// A full (flashing) refresh now and then clears e-ink ghosting.
			if r, ok := p.(refresher); ok {
				full = full || time.Since(lastFull) >= r.fullRefresh()
			} else {
				full = full || updates%10 == 0
			}
			if full {
				lastFull = time.Now()
			}
			kindle.Show(c.Gray, full, shot)
			updates++
		}
		timer := time.NewTimer(wait)
		// Saved settings show up within a few seconds, even with a long interval.
		cfgTime := modTime(cfgPath)
		poll := time.NewTicker(5 * time.Second)
	wait:
		for {
			select {
			case <-timer.C:
				break wait
			case <-poll.C:
				if !modTime(cfgPath).Equal(cfgTime) {
					timer.Stop()
					break wait
				}
			case pt := <-taps:
				if p.(tapper).tap(c, toCanvas(pt, w, h, c)) {
					timer.Stop()
					break wait
				}
			}
		}
		poll.Stop()
	}
}

func modTime(path string) time.Time {
	if fi, err := os.Stat(path); err == nil {
		return fi.ModTime()
	}
	return time.Time{}
}

// safeRender turns a panic into an error screen instead of a dead panel.
func safeRender(p panel, c *Canvas, cfgPath string) (wait time.Duration, err error) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("panic: %v\n%s", r, debug.Stack())
			err = fmt.Errorf("internal error: %v", r)
		}
	}()
	return p.render(c, cfgPath)
}

func errorScreen(c *Canvas, err error) {
	m := c.U * 8
	c.Text(c.F(6, true), int(m), int(m), "Something's not right", 0)
	c.Paragraph(c.F(3.6, false), int(m), int(m+c.U*12), c.W-int(2*m), err.Error(), 40, 12)
	c.Paragraph(c.F(3, false), int(m), c.H-int(c.U*16), c.W-int(2*m),
		"Edit the config.json for this app in the Remote web app (Device → Apps), or over USB in the unlocked folder.", 90, 3)
}

/* ---------- shared helpers ---------- */

func readConfig(path string, v any) error {
	b, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(b, v); err != nil {
		return fmt.Errorf("config.json is not valid JSON: %v", err)
	}
	return nil
}

func getJSON(url string, headers map[string]string, v any) error {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}
	for k, val := range headers {
		req.Header.Set(k, val)
	}
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return fmt.Errorf("%s: %s", url, res.Status)
	}
	return json.NewDecoder(res.Body).Decode(v)
}

func location(name string) *time.Location {
	if name != "" {
		if l, err := time.LoadLocation(name); err == nil {
			return l
		}
	}
	return time.Local
}

// header draws the panel title on the left and the time on the right,
// returning the y where content starts.
func header(c *Canvas, title string, now time.Time) int {
	m := int(c.U * 6)
	c.Text(c.F(7, true), m, m, c.Ellipsize(c.F(7, true), title, c.W*6/10), 0)
	c.TextRight(c.F(7, false), c.W-m, m, now.Format("15:04"), 0)
	y := m + int(c.U*11)
	c.HLine(m, y, c.W-2*m, max(2, int(c.U*0.5)), 0)
	return y + int(c.U*4)
}

// footer writes a small status line at the bottom.
func footer(c *Canvas, s string) {
	m := int(c.U * 6)
	f := c.F(2.6, false)
	c.Text(f, m, c.H-m-f.LineHeight(), s, 110)
	if b := kindle.LipcGetInt(kindle.Powerd, "battLevel"); b > 0 {
		c.TextRight(f, c.W-m, c.H-m-f.LineHeight(), fmt.Sprintf("%d%%", b), 110)
	}
}

// T picks the label for the panel's language.
func T(lang, en, vi, zh string) string {
	switch lang {
	case "vi":
		return vi
	case "zh":
		return zh
	}
	return en
}

func decodeImage(url string) (image.Image, error) {
	res, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("%s: %s", url, res.Status)
	}
	img, _, err := image.Decode(res.Body)
	return img, err
}
