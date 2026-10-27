// ku-httpd: web server for a Kindle, with an optional Remote web app.
//
// With "remote" on (the default, see <ku>/http/config.json) it serves a small web app (pair by scanning the QR code shown on the Kindle) that
// can show images/PDFs/notes/drawings on the e-ink screen, run a photo frame,
// manage books, change the light, take screenshots, and ping you via ntfy when
// the Kindle comes online, and serves <ku>/www at /www/.
// With remote off it only serves <ku>/www at /.
package main

import (
	"crypto/rand"
	"crypto/subtle"
	"embed"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"image"
	"image/png"
	"io"
	"io/fs"
	"log"
	"math/big"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"kindle.trinh.uk/unlocked/internal/kindle"
)

//go:embed web
var webFS embed.FS

var (
	kuDir   = "/mnt/us/unlocked"
	docsDir = "/mnt/us/documents"
	dataDir string // <ku>/http
	port    string
	token   string
	pin     string
)

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	flag.StringVar(&kuDir, "ku", kuDir, "data folder")
	flag.StringVar(&docsDir, "docs", docsDir, "Kindle documents folder")
	noCard := flag.Bool("no-card", false, "don't draw the pairing card on start")
	flag.Parse()

	port = (*addr)[strings.LastIndex(*addr, ":")+1:]
	dataDir = filepath.Join(kuDir, "http")
	os.MkdirAll(filepath.Join(dataDir, "frame"), 0755)
	os.MkdirAll(filepath.Join(kuDir, "www"), 0755)
	token = readOrCreate(filepath.Join(dataDir, "token"), func() string { return randHex(24) })
	pin = readOrCreate(filepath.Join(dataDir, "pin"), randPIN)
	loadSettings()

	site := http.FileServer(http.Dir(filepath.Join(kuDir, "www")))
	ensureIndex()
	mux := http.NewServeMux()
	web, _ := fs.Sub(webFS, "web")
	mux.Handle("GET /", http.FileServer(http.FS(web)))
	mux.Handle("GET /www/", http.StripPrefix("/www/", site))
	mux.HandleFunc("GET /icons/{file}", iconHandler)
	mux.HandleFunc("GET /pair", pairLink)
	mux.HandleFunc("POST /api/pair", pairAPI)

	api := func(pattern string, h func(http.ResponseWriter, *http.Request) (any, error)) {
		mux.HandleFunc(pattern, authed(func(w http.ResponseWriter, r *http.Request) {
			v, err := h(w, r)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			if v != nil {
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(v)
			}
		}))
	}

	api("GET /api/status", func(w http.ResponseWriter, r *http.Request) (any, error) { return readStatus(), nil })
	api("POST /api/light", func(w http.ResponseWriter, r *http.Request) (any, error) {
		var b struct{ Value int }
		if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
			return nil, err
		}
		return ok(lipcSet(powerd, "flIntensity", fmt.Sprint(b.Value)))
	})
	api("POST /api/awake", func(w http.ResponseWriter, r *http.Request) (any, error) {
		var b struct{ On bool }
		json.NewDecoder(r.Body).Decode(&b)
		setAwake(b.On)
		return ok(nil)
	})
	api("POST /api/hold", func(w http.ResponseWriter, r *http.Request) (any, error) {
		var b struct{ On bool }
		json.NewDecoder(r.Body).Decode(&b)
		if !b.On {
			frame.stop()
		}
		return ok(setUIPaused(b.On))
	})
	api("POST /api/clear", func(w http.ResponseWriter, r *http.Request) (any, error) { clearScreen(); return ok(nil) })
	api("POST /api/home", func(w http.ResponseWriter, r *http.Request) (any, error) {
		frame.stop()
		if uiPaused() {
			setUIPaused(false)
		}
		return ok(goHome())
	})
	api("POST /api/card", func(w http.ResponseWriter, r *http.Request) (any, error) { return ok(showCard()) })
	api("POST /api/sleep", func(w http.ResponseWriter, r *http.Request) (any, error) {
		frame.stop()
		setAwake(false)
		return ok(lipcSet(powerd, "powerButton", "1"))
	})
	api("POST /api/reboot", func(w http.ResponseWriter, r *http.Request) (any, error) {
		go func() { time.Sleep(time.Second); runCmd("reboot") }()
		return ok(nil)
	})
	api("POST /api/show", func(w http.ResponseWriter, r *http.Request) (any, error) {
		img, _, err := image.Decode(http.MaxBytesReader(w, r.Body, 30<<20))
		if err != nil {
			return nil, err
		}
		frame.stop()
		if r.URL.Query().Get("hold") == "1" && !uiPaused() {
			setUIPaused(true)
			setAwake(true)
			time.Sleep(1500 * time.Millisecond) // let the UI finish its last redraw
		}
		// fast=1: partial refresh, no flash (screen mirroring sends many frames)
		return ok(kindle.Show(img, r.URL.Query().Get("fast") != "1", showPath))
	})
	api("POST /api/url", func(w http.ResponseWriter, r *http.Request) (any, error) {
		var b struct{ URL string }
		json.NewDecoder(r.Body).Decode(&b)
		if !strings.HasPrefix(b.URL, "http://") && !strings.HasPrefix(b.URL, "https://") {
			return nil, fmt.Errorf("URL must start with http:// or https://")
		}
		frame.stop()
		if uiPaused() {
			setUIPaused(false)
			time.Sleep(4 * time.Second)
		}
		return ok(openURL(b.URL))
	})
	mux.HandleFunc("GET /api/screen.png", authed(func(w http.ResponseWriter, r *http.Request) {
		img, err := screenshot()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "image/png")
		w.Header().Set("Cache-Control", "no-store")
		png.Encode(w, img)
	}))

	api("GET /api/books", func(w http.ResponseWriter, r *http.Request) (any, error) { return listBooks(), nil })
	api("POST /api/books", func(w http.ResponseWriter, r *http.Request) (any, error) {
		n, err := saveUploads(r, docsDir)
		return map[string]int{"saved": n}, err
	})
	api("DELETE /api/books", func(w http.ResponseWriter, r *http.Request) (any, error) {
		name := filepath.Base(r.URL.Query().Get("name"))
		if name == "." || strings.HasPrefix(name, ".") || strings.HasSuffix(name, ".sh") {
			return nil, fmt.Errorf("not allowed")
		}
		return ok(os.Remove(filepath.Join(docsDir, name)))
	})

	api("POST /api/frame/add", func(w http.ResponseWriter, r *http.Request) (any, error) {
		img, _, err := image.Decode(http.MaxBytesReader(w, r.Body, 30<<20))
		if err != nil {
			return nil, err
		}
		sw, sh := screenSize()
		f, err := os.Create(filepath.Join(dataDir, "frame", fmt.Sprintf("%d.png", time.Now().UnixNano())))
		if err != nil {
			return nil, err
		}
		defer f.Close()
		return ok(png.Encode(f, fitGray(img, sw, sh)))
	})
	api("POST /api/frame", func(w http.ResponseWriter, r *http.Request) (any, error) {
		var b struct {
			On      bool
			Minutes int
		}
		json.NewDecoder(r.Body).Decode(&b)
		if !b.On {
			frame.stop()
			return ok(nil)
		}
		return ok(frame.start(b.Minutes))
	})
	api("DELETE /api/frame", func(w http.ResponseWriter, r *http.Request) (any, error) {
		frame.stop()
		files, _ := filepath.Glob(filepath.Join(dataDir, "frame", "*.png"))
		for _, f := range files {
			os.Remove(f)
		}
		return ok(nil)
	})

	api("GET /api/site", func(w http.ResponseWriter, r *http.Request) (any, error) { return listSite(), nil })
	api("POST /api/site", func(w http.ResponseWriter, r *http.Request) (any, error) {
		n, err := uploadSite(r)
		return map[string]int{"saved": n}, err
	})
	api("DELETE /api/site", func(w http.ResponseWriter, r *http.Request) (any, error) {
		return ok(deleteSite(r.URL.Query().Get("path")))
	})
	api("GET /api/scripts", func(w http.ResponseWriter, r *http.Request) (any, error) { return listScripts(), nil })
	api("POST /api/scripts/{name}", func(w http.ResponseWriter, r *http.Request) (any, error) {
		return runScript(r.PathValue("name"))
	})
	api("GET /api/configs", func(w http.ResponseWriter, r *http.Request) (any, error) { return listConfigs(), nil })
	mux.HandleFunc("GET /api/config/{app}", authed(func(w http.ResponseWriter, r *http.Request) {
		p, err := configPath(r.PathValue("app"))
		if err == nil {
			var b []byte
			if b, err = os.ReadFile(p); err == nil {
				w.Header().Set("Content-Type", "application/json")
				w.Write(b)
				return
			}
		}
		http.Error(w, err.Error(), http.StatusNotFound)
	}))
	api("PUT /api/config/{app}", func(w http.ResponseWriter, r *http.Request) (any, error) {
		p, err := configPath(r.PathValue("app"))
		if err != nil {
			return nil, err
		}
		if _, err := os.Stat(p); err != nil {
			return nil, fmt.Errorf("no such app")
		}
		b, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			return nil, err
		}
		if !json.Valid(b) {
			return nil, fmt.Errorf("that's not valid JSON")
		}
		if err := os.WriteFile(p, b, 0644); err != nil {
			return nil, err
		}
		if filepath.Base(filepath.Dir(p)) == "http" {
			loadSettings()
		}
		return ok(nil)
	})
	api("GET /api/token", func(w http.ResponseWriter, r *http.Request) (any, error) {
		return map[string]string{"token": token, "url": remoteURL()}, nil
	})
	api("GET /api/settings", func(w http.ResponseWriter, r *http.Request) (any, error) { return getSettings(), nil })
	api("POST /api/settings", func(w http.ResponseWriter, r *http.Request) (any, error) {
		var s Settings
		if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
			return nil, err
		}
		if s.Ntfy != "" && !strings.HasPrefix(s.Ntfy, "https://") {
			return nil, fmt.Errorf("ntfy URL must start with https://")
		}
		if !s.Remote {
			frame.stop()
		}
		return ok(saveSettings(s))
	})
	api("POST /api/notify-test", func(w http.ResponseWriter, r *http.Request) (any, error) {
		return ok(notify("Kindle Remote works", "Notifications are on."))
	})

	if !*noCard && getSettings().Remote {
		go func() { time.Sleep(time.Second); showCard() }()
	}
	go watchOnline()

	// Remote can be switched off live; then only the website is served.
	root := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if getSettings().Remote {
			mux.ServeHTTP(w, r)
		} else {
			site.ServeHTTP(w, r)
		}
	})
	log.Printf("ku-httpd on %s (remote %v, pin %s)", *addr, getSettings().Remote, pin)
	log.Fatal(http.ListenAndServe(*addr, root))
}

func ok(err error) (any, error) {
	if err != nil {
		return nil, err
	}
	return map[string]bool{"ok": true}, nil
}

const defaultIndex = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Kindle</title><body style="font:20px system-ui,sans-serif;margin:3em auto;max-width:32em;padding:0 1em">
<h1>Hello from my Kindle</h1><p>Edit <code>/mnt/us/unlocked/www/index.html</code> to change this page.</p>`

func ensureIndex() {
	p := filepath.Join(kuDir, "www", "index.html")
	if _, err := os.Stat(p); os.IsNotExist(err) {
		os.WriteFile(p, []byte(defaultIndex), 0644)
	}
}

func runCmd(name string, args ...string) error {
	return execCommand(name, args...).Run()
}

/* ---------- pairing ---------- */

func randHex(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func randPIN() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(1000000))
	return fmt.Sprintf("%06d", n.Int64())
}

func readOrCreate(path string, make func() string) string {
	if b, err := os.ReadFile(path); err == nil && len(strings.TrimSpace(string(b))) > 0 {
		return strings.TrimSpace(string(b))
	}
	v := make()
	os.WriteFile(path, []byte(v+"\n"), 0600)
	return v
}

var pairFails = struct {
	sync.Mutex
	n int
}{}

func checkPIN(p string) bool {
	pairFails.Lock()
	defer pairFails.Unlock()
	if pairFails.n >= 10 {
		time.Sleep(3 * time.Second) // slow down guessing
	}
	if subtle.ConstantTimeCompare([]byte(p), []byte(pin)) == 1 {
		pairFails.n = 0
		return true
	}
	pairFails.n++
	time.Sleep(500 * time.Millisecond)
	return false
}

func setCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name: "ku", Value: token, Path: "/", MaxAge: 400 * 24 * 3600,
		HttpOnly: true, SameSite: http.SameSiteStrictMode,
	})
}

func pairLink(w http.ResponseWriter, r *http.Request) {
	if checkPIN(r.URL.Query().Get("pin")) {
		setCookie(w)
	}
	http.Redirect(w, r, "/", http.StatusFound)
}

func pairAPI(w http.ResponseWriter, r *http.Request) {
	var b struct{ PIN string }
	json.NewDecoder(r.Body).Decode(&b)
	if !checkPIN(strings.TrimSpace(b.PIN)) {
		http.Error(w, "wrong PIN", http.StatusUnauthorized)
		return
	}
	setCookie(w)
	w.Write([]byte(`{"ok":true}`))
}

func authed(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		got := ""
		if c, err := r.Cookie("ku"); err == nil {
			got = c.Value
		} else if a := r.Header.Get("Authorization"); strings.HasPrefix(a, "Bearer ") {
			got = strings.TrimPrefix(a, "Bearer ")
		}
		if subtle.ConstantTimeCompare([]byte(got), []byte(token)) != 1 {
			http.Error(w, "not paired", http.StatusUnauthorized)
			return
		}
		h(w, r)
	}
}

/* ---------- books ---------- */

type Book struct {
	Name string `json:"name"`
	Size int64  `json:"size"`
	Time int64  `json:"time"`
}

func listBooks() []Book {
	books := []Book{}
	entries, _ := os.ReadDir(docsDir)
	for _, e := range entries {
		n := e.Name()
		if e.IsDir() || strings.HasPrefix(n, ".") || strings.HasSuffix(n, ".sh") || strings.HasSuffix(n, ".sdr") {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		books = append(books, Book{n, info.Size(), info.ModTime().Unix()})
	}
	sort.Slice(books, func(i, j int) bool { return books[i].Time > books[j].Time })
	return books
}

func saveUploads(r *http.Request, dir string) (int, error) {
	mr, err := r.MultipartReader()
	if err != nil {
		return 0, err
	}
	saved := 0
	for {
		part, err := mr.NextPart()
		if err == io.EOF {
			return saved, nil
		}
		if err != nil {
			return saved, err
		}
		name := filepath.Base(part.FileName())
		if name == "." || name == "/" || name == "" || strings.HasPrefix(name, ".") || strings.HasSuffix(name, ".sh") {
			continue
		}
		f, err := os.Create(filepath.Join(dir, name))
		if err != nil {
			return saved, err
		}
		_, err = io.Copy(f, part)
		f.Close()
		if err != nil {
			return saved, err
		}
		saved++
	}
}

/* ---------- photo frame ---------- */

type photoFrame struct {
	mu   sync.Mutex
	quit chan struct{}
}

var frame photoFrame

func (p *photoFrame) state() (bool, int) {
	files, _ := filepath.Glob(filepath.Join(dataDir, "frame", "*.png"))
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.quit != nil, len(files)
}

func (p *photoFrame) start(minutes int) error {
	files, _ := filepath.Glob(filepath.Join(dataDir, "frame", "*.png"))
	if len(files) == 0 {
		return fmt.Errorf("add some photos first")
	}
	if minutes < 1 {
		minutes = 1
	}
	p.stop()
	setUIPaused(true)
	setAwake(true)
	quit := make(chan struct{})
	p.mu.Lock()
	p.quit = quit
	p.mu.Unlock()
	go func() {
		time.Sleep(1500 * time.Millisecond)
		for i := 0; ; i++ {
			files, _ := filepath.Glob(filepath.Join(dataDir, "frame", "*.png"))
			if len(files) > 0 {
				sort.Strings(files)
				if f, err := os.Open(files[i%len(files)]); err == nil {
					if img, err := png.Decode(f); err == nil {
						showImage(img)
					}
					f.Close()
				}
			}
			select {
			case <-quit:
				return
			case <-time.After(time.Duration(minutes) * time.Minute):
			}
		}
	}()
	return nil
}

func (p *photoFrame) stop() {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.quit != nil {
		close(p.quit)
		p.quit = nil
	}
}
