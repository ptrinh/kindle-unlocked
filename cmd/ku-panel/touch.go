package main

// Taps on the touchscreen, read straight from the Linux input device (the
// stock UI is stopped while a panel runs, so nothing else is listening).

import (
	"encoding/binary"
	"image"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"
	"unsafe"

	"kindle.trinh.uk/unlocked/internal/kindle"
)

const (
	evKey       = 0x01
	evAbs       = 0x03
	absX        = 0x00
	absY        = 0x01
	absMTX      = 0x35
	absMTY      = 0x36
	absMTTrack  = 0x39
	btnTouch    = 0x14a
	inputEvSize = 16 // struct input_event on 32-bit ARM
)

// tapper is a panel that reacts to taps (in canvas coordinates). It returns
// true when the panel should be redrawn right away.
type tapper interface {
	tap(c *Canvas, p image.Point) bool
}

type absRange struct{ min, max int32 }

func absInfo(fd uintptr, code int) (absRange, bool) {
	var info [6]int32 // struct input_absinfo
	req := uintptr(2)<<30 | 24<<16 | 'E'<<8 | uintptr(0x40+code)
	if _, _, e := syscall.Syscall(syscall.SYS_IOCTL, fd, req, uintptr(unsafe.Pointer(&info))); e != 0 {
		return absRange{}, false
	}
	return absRange{info[1], info[2]}, info[2] > info[1]
}

// findTouch opens the first input device that reports X/Y positions.
func findTouch() (f *os.File, xr, yr absRange, mt bool) {
	paths, _ := filepath.Glob("/dev/input/event*")
	for _, p := range paths {
		f, err := os.Open(p)
		if err != nil {
			continue
		}
		if xr, ok := absInfo(f.Fd(), absMTX); ok {
			if yr, ok := absInfo(f.Fd(), absMTY); ok {
				log.Printf("touch: %s multitouch x%v y%v", p, xr, yr)
				return f, xr, yr, true
			}
		}
		if xr, ok := absInfo(f.Fd(), absX); ok {
			if yr, ok := absInfo(f.Fd(), absY); ok {
				log.Printf("touch: %s x%v y%v", p, xr, yr)
				return f, xr, yr, false
			}
		}
		f.Close()
	}
	return nil, absRange{}, absRange{}, false
}

// readTaps sends each finger lift as a point in screen pixels (sw×sh).
func readTaps(sw, sh int, out chan<- image.Point) {
	f, xr, yr, mt := findTouch()
	if f == nil {
		log.Print("touch: no touchscreen found")
		return
	}
	defer f.Close()
	buf := make([]byte, inputEvSize*64)
	var x, y int32
	down, logged := false, 0
	var lastTap time.Time
	for {
		n, err := f.Read(buf)
		if err != nil {
			log.Print("touch: ", err)
			return
		}
		for i := 0; i+inputEvSize <= n; i += inputEvSize {
			typ := binary.LittleEndian.Uint16(buf[i+8:])
			code := binary.LittleEndian.Uint16(buf[i+10:])
			val := int32(binary.LittleEndian.Uint32(buf[i+12:]))
			lift := false
			switch {
			case typ == evAbs && (code == absMTX || (!mt && code == absX)):
				x, down = val, true
			case typ == evAbs && (code == absMTY || (!mt && code == absY)):
				y, down = val, true
			case typ == evAbs && code == absMTTrack && val == -1:
				lift = true
			case typ == evKey && code == btnTouch && val == 0:
				lift = true
			}
			if !lift || !down || time.Since(lastTap) < 400*time.Millisecond {
				continue
			}
			down, lastTap = false, time.Now()
			p := image.Point{
				int(int64(x-xr.min) * int64(sw) / int64(xr.max-xr.min+1)),
				int(int64(y-yr.min) * int64(sh) / int64(yr.max-yr.min+1)),
			}
			if logged < 20 { // enough to check the mapping, without growing the log forever
				log.Printf("tap raw %d,%d -> screen %v", x, y, p)
				logged++
			}
			select {
			case out <- p:
			default: // busy: drop it
			}
		}
	}
}

// toCanvas maps a screen point to the canvas, which kindle.Show turns
// sideways when its orientation differs from the screen's.
func toCanvas(p image.Point, sw, sh int, c *Canvas) image.Point {
	if (c.W > c.H) == (sw > sh) {
		return p
	}
	return image.Point{p.Y, c.H - 1 - p.X}
}

// exitPanel turns the panel off the same way tapping it in the Library does,
// so its pid file and the keep-awake setting are tidied up too.
func exitPanel(mode string) {
	exec.Command("/var/local/kmc/bin/kpm", "launch", "ku-"+mode).Start()
	time.Sleep(15 * time.Second) // launch.sh should have stopped us by now
	kindle.SetUIPaused(false)
	os.Exit(0)
}
