package main

// Website files (<ku>/www) and user scripts (<ku>/scripts) for the Remote app.

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

func wwwDir() string     { return filepath.Join(kuDir, "www") }
func scriptsDir() string { return filepath.Join(kuDir, "scripts") }

// inside resolves rel under root and refuses anything that escapes it.
func inside(root, rel string) (string, error) {
	p := filepath.Join(root, filepath.Clean("/"+rel))
	if p != root && !strings.HasPrefix(p, root+string(filepath.Separator)) {
		return "", fmt.Errorf("bad path")
	}
	return p, nil
}

type SiteFile struct {
	Path string `json:"path"`
	Size int64  `json:"size"`
	Dir  bool   `json:"dir"`
}

func listSite() []SiteFile {
	root := wwwDir()
	files := []SiteFile{}
	filepath.Walk(root, func(p string, info os.FileInfo, err error) error {
		if err != nil || p == root {
			return nil
		}
		rel, _ := filepath.Rel(root, p)
		files = append(files, SiteFile{filepath.ToSlash(rel), info.Size(), info.IsDir()})
		return nil
	})
	sort.Slice(files, func(i, j int) bool { return files[i].Path < files[j].Path })
	return files
}

// uploadSite stores files under <www>/<dir>; .zip files are unpacked there.
func uploadSite(r *http.Request) (int, error) {
	dir, err := inside(wwwDir(), r.URL.Query().Get("dir"))
	if err != nil {
		return 0, err
	}
	os.MkdirAll(dir, 0755)
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
		if name == "." || name == "/" || name == "" {
			continue
		}
		dst := filepath.Join(dir, name)
		f, err := os.Create(dst)
		if err != nil {
			return saved, err
		}
		_, err = io.Copy(f, part)
		f.Close()
		if err != nil {
			return saved, err
		}
		if strings.HasSuffix(strings.ToLower(name), ".zip") && r.URL.Query().Get("unzip") != "0" {
			n, err := unzip(dst, dir)
			os.Remove(dst)
			if err != nil {
				return saved, err
			}
			saved += n
			continue
		}
		saved++
	}
}

func unzip(src, dir string) (int, error) {
	z, err := zip.OpenReader(src)
	if err != nil {
		return 0, err
	}
	defer z.Close()
	n := 0
	for _, f := range z.File {
		if strings.HasPrefix(f.Name, "__MACOSX/") || strings.HasSuffix(f.Name, ".DS_Store") {
			continue
		}
		dst, err := inside(dir, f.Name)
		if err != nil {
			return n, err
		}
		if f.FileInfo().IsDir() {
			os.MkdirAll(dst, 0755)
			continue
		}
		os.MkdirAll(filepath.Dir(dst), 0755)
		rc, err := f.Open()
		if err != nil {
			return n, err
		}
		out, err := os.Create(dst)
		if err != nil {
			rc.Close()
			return n, err
		}
		_, err = io.Copy(out, io.LimitReader(rc, 500<<20))
		out.Close()
		rc.Close()
		if err != nil {
			return n, err
		}
		n++
	}
	return n, nil
}

func deleteSite(rel string) error {
	p, err := inside(wwwDir(), rel)
	if err != nil || p == wwwDir() {
		return fmt.Errorf("bad path")
	}
	return os.RemoveAll(p)
}

/* ---------- scripts ---------- */

const exampleScript = `#!/bin/sh
# Every .sh file in this folder shows up as a button in Kindle Remote.
# The first "# " comment line becomes the button's description.
# Show battery and Wi-Fi details.
echo "Battery: $(lipc-get-prop com.lab126.powerd battLevel)%"
ifconfig wlan0 | grep 'inet addr'
`

type Script struct {
	Name string `json:"name"`
	Desc string `json:"desc"`
}

func listScripts() []Script {
	os.MkdirAll(scriptsDir(), 0755)
	files, _ := filepath.Glob(filepath.Join(scriptsDir(), "*.sh"))
	if len(files) == 0 {
		p := filepath.Join(scriptsDir(), "battery.sh")
		os.WriteFile(p, []byte(exampleScript), 0755)
		files = []string{p}
	}
	sort.Strings(files)
	out := []Script{}
	for _, f := range files {
		desc := ""
		if b, err := os.ReadFile(f); err == nil {
			for _, l := range strings.Split(string(b), "\n")[1:] {
				if strings.HasPrefix(l, "# ") {
					desc = strings.TrimPrefix(l, "# ")
				}
				if !strings.HasPrefix(l, "#") {
					break
				}
			}
		}
		out = append(out, Script{strings.TrimSuffix(filepath.Base(f), ".sh"), desc})
	}
	return out
}

// runScript runs <scripts>/<name>.sh with a timeout and returns its output.
func runScript(name string) (map[string]any, error) {
	p, err := inside(scriptsDir(), filepath.Base(name)+".sh")
	if err != nil {
		return nil, err
	}
	if _, err := os.Stat(p); err != nil {
		return nil, fmt.Errorf("no such script")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	cmd := exec.CommandContext(ctx, "/bin/sh", p)
	cmd.Dir = scriptsDir()
	cmd.Env = append(os.Environ(), "KU="+kuDir, "KU_URL="+remoteURL())
	out, err := cmd.CombinedOutput()
	code := 0
	if err != nil {
		code = 1
		if ee, ok := err.(*exec.ExitError); ok {
			code = ee.ExitCode()
		}
	}
	if len(out) > 64<<10 {
		out = out[len(out)-64<<10:]
	}
	return map[string]any{"output": string(out), "code": code}, nil
}

/* ---------- app configs ---------- */

// listConfigs names every app folder under <ku> that has a config.json.
func listConfigs() []string {
	files, _ := filepath.Glob(filepath.Join(kuDir, "*", "config.json"))
	out := []string{}
	for _, f := range files {
		out = append(out, filepath.Base(filepath.Dir(f)))
	}
	sort.Strings(out)
	return out
}

func configPath(app string) (string, error) {
	app = filepath.Base(app)
	if app == "." || strings.HasPrefix(app, ".") {
		return "", fmt.Errorf("bad app")
	}
	return filepath.Join(kuDir, app, "config.json"), nil
}
