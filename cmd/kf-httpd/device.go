package main

// Device status, plus short names for the shared kindle helpers.

import (
	"image"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
	"time"

	"kindle.trinh.uk/kfree/internal/kindle"
)

const showPath = "/tmp/kf-show.png"

// Thin aliases so the handlers read naturally.
var (
	lipcSet     = kindle.LipcSet
	lipcGetInt  = kindle.LipcGetInt
	setAwake    = kindle.SetAwake
	openURL     = kindle.OpenURL
	goHome      = kindle.GoHome
	setUIPaused = kindle.SetUIPaused
	uiPaused    = kindle.UIPaused
	clearScreen = kindle.ClearScreen
	screenSize  = kindle.ScreenSize
	screenshot  = kindle.Screenshot
	fitGray     = kindle.FitGray
	wifiIP      = kindle.WifiIP
)

const powerd = kindle.Powerd

func showImage(img image.Image) error { return kindle.Show(img, true, showPath) }

/* ---------- status ---------- */

type Status struct {
	Battery    int     `json:"battery"`
	Charging   bool    `json:"charging"`
	Light      int     `json:"light"`
	LightMax   int     `json:"lightMax"`
	Awake      bool    `json:"awake"`
	UIPaused   bool    `json:"uiPaused"`
	IP         string  `json:"ip"`
	TailnetIP  string  `json:"tailnetIP"`
	Width      int     `json:"width"`
	Height     int     `json:"height"`
	FreeGB     float64 `json:"freeGB"`
	TotalGB    float64 `json:"totalGB"`
	Uptime     string  `json:"uptime"`
	Frame      bool    `json:"frame"`
	FrameCount int     `json:"frameCount"`
}

func readStatus() Status {
	w, h := screenSize()
	s := Status{
		Battery:   lipcGetInt(powerd, "battLevel"),
		Charging:  lipcGetInt(powerd, "isCharging") == 1,
		Light:     lipcGetInt(powerd, "flIntensity"),
		LightMax:  lipcGetInt(powerd, "flMaxIntensity"),
		Awake:     lipcGetInt(powerd, "preventScreenSaver") == 1,
		UIPaused:  uiPaused(),
		IP:        wifiIP(),
		TailnetIP: tailnetIP(),
		Width:     w,
		Height:    h,
	}
	var st syscall.Statfs_t
	if syscall.Statfs(docsDir, &st) == nil {
		s.FreeGB = float64(st.Bavail) * float64(st.Bsize) / 1e9
		s.TotalGB = float64(st.Blocks) * float64(st.Bsize) / 1e9
	}
	if b, err := os.ReadFile("/proc/uptime"); err == nil {
		if f, err := strconv.ParseFloat(strings.Fields(string(b))[0], 64); err == nil {
			s.Uptime = (time.Duration(f) * time.Second).Round(time.Minute).String()
		}
	}
	s.Frame, s.FrameCount = frame.state()
	return s
}

func tailnetIP() string {
	bin := kfDir + "/tailscale/bin/tailscale"
	if _, err := os.Stat(bin); err != nil {
		return ""
	}
	out, err := exec.Command(bin, "--socket=/tmp/kf-tailscaled.sock", "ip", "-4").Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}
