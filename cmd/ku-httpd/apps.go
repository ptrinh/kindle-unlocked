package main

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"sync"
)

/* ---------- apps (KPM packages) ---------- */

// The Remote's Apps tab installs, removes and opens KPM packages, so nothing
// has to be typed on the Kindle. Installs can take minutes (Tailscale is
// ~30 MB), so they run in the background and the phone polls /api/apps.

const (
	kpmBin      = "/var/local/kmc/bin/kpm"
	kpmSu       = "/var/local/kmc/bin/su"
	kpmPackages = "/mnt/us/kmc/kpm/packages"
	selfPackage = "ku-http" // reinstalling or removing it would stop this server
)

var validPkg = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]*$`)

var apps struct {
	sync.Mutex
	busy, action, log string
	failed            bool
}

type appsState struct {
	Installed []string `json:"installed"`
	Busy      string   `json:"busy"`
	Action    string   `json:"action"`
	Failed    bool     `json:"failed"`
	Log       string   `json:"log"`
	Self      string   `json:"self"`
}

func listApps() appsState {
	entries, _ := os.ReadDir(kpmPackages)
	installed := []string{}
	for _, e := range entries {
		if e.IsDir() && e.Name() != "tmp" {
			installed = append(installed, e.Name())
		}
	}
	apps.Lock()
	defer apps.Unlock()
	return appsState{installed, apps.busy, apps.action, apps.failed, apps.log, selfPackage}
}

// appAction starts `kpm <action> <id>` in the background.
func appAction(id, action string) error {
	if !validPkg.MatchString(id) {
		return fmt.Errorf("bad app id")
	}
	if action != "install" && action != "uninstall" && action != "launch" {
		return fmt.Errorf("unknown action")
	}
	if id == selfPackage && action != "launch" {
		return fmt.Errorf("can't do that from the Remote")
	}
	apps.Lock()
	defer apps.Unlock()
	if apps.busy != "" {
		return fmt.Errorf("busy with %s", apps.busy)
	}
	args := kpmBin + " -y " + action + " " + id
	if action == "launch" {
		args = kpmBin + " launch " + id
	}
	apps.busy, apps.action, apps.log, apps.failed = id, action, "", false
	go func() {
		var out bytes.Buffer
		cmd := exec.Command(kpmSu, "-c", args)
		cmd.Stdout, cmd.Stderr = &out, &out
		err := cmd.Run()
		apps.Lock()
		apps.busy, apps.failed = "", err != nil || strings.Contains(out.String(), "[ERR]")
		apps.log = ansi.ReplaceAllString(out.String(), "")
		apps.Unlock()
	}()
	return nil
}

var ansi = regexp.MustCompile(`\x1b\[[0-9;]*m`)
