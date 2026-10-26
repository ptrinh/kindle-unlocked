// Package kindle wraps the bits of the Kindle we drive: lipc properties,
// eips drawing, the framebuffer, and the stock UI service.
package kindle

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	_ "image/jpeg"
	"image/png"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
	"unsafe"

	// Bundled CA roots: Go's TLS can't rely on the Kindle's certificate store.
	_ "golang.org/x/crypto/x509roots/fallback"
)

const Powerd = "com.lab126.powerd"

func LipcGet(service, prop string) string {
	out, err := exec.Command("lipc-get-prop", service, prop).Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

func LipcGetInt(service, prop string) int {
	n, _ := strconv.Atoi(LipcGet(service, prop))
	return n
}

func LipcSet(service, prop, value string) error {
	flag := "-s"
	if _, err := strconv.Atoi(value); err == nil {
		flag = "-i"
	}
	return exec.Command("lipc-set-prop", flag, service, prop, value).Run()
}

func SetAwake(on bool) {
	v := "0"
	if on {
		v = "1"
	}
	LipcSet(Powerd, "preventScreenSaver", v)
}

func OpenURL(u string) error {
	return LipcSet("com.lab126.appmgrd", "start", "app://com.lab126.browser?view="+u)
}

func GoHome() error {
	return LipcSet("com.lab126.appmgrd", "start", "app://com.lab126.booklet.home")
}

// SetUIPaused stops/starts the stock UI so our drawing isn't painted over.
// Newer firmware names the job lab126_gui, older ones framework.
func SetUIPaused(paused bool) error {
	verb := "start"
	if paused {
		verb = "stop"
	}
	err := exec.Command(verb, "lab126_gui").Run()
	if err != nil {
		err = exec.Command(verb, "framework").Run()
	}
	return err
}

func UIPaused() bool {
	for _, job := range []string{"lab126_gui", "framework"} {
		out, err := exec.Command("status", job).Output()
		if err == nil {
			return !strings.Contains(string(out), "running")
		}
	}
	return false
}

func ClearScreen() {
	exec.Command("eips", "-c").Run()
	exec.Command("eips", "-c").Run()
}

// Show draws img full screen. full=true flashes the panel (no ghosting);
// false is a quick partial update, good for frequent changes.
func Show(img image.Image, full bool, path string) error {
	w, h := ScreenSize()
	var buf bytes.Buffer
	if err := png.Encode(&buf, FitGray(img, w, h)); err != nil {
		return err
	}
	if err := os.WriteFile(path, buf.Bytes(), 0644); err != nil {
		return err
	}
	args := []string{"-g", path}
	if full {
		args = append([]string{"-f"}, args...)
	}
	return exec.Command("eips", args...).Run()
}

// FitGray scales img to fit w×h (letterboxed on white) as 8-bit grey.
// A landscape image on a portrait panel (or vice versa) is turned sideways.
func FitGray(img image.Image, w, h int) *image.Gray {
	b := img.Bounds()
	if (b.Dx() > b.Dy()) != (w > h) && b.Dx() != b.Dy() {
		img = rotate90(img)
		b = img.Bounds()
	}
	dst := image.NewGray(image.Rect(0, 0, w, h))
	draw.Draw(dst, dst.Bounds(), image.White, image.Point{}, draw.Src)
	if b.Dx() == w && b.Dy() == h {
		draw.Draw(dst, dst.Bounds(), img, b.Min, draw.Src)
		return dst
	}
	scale := min(float64(w)/float64(b.Dx()), float64(h)/float64(b.Dy()))
	sw, sh := int(float64(b.Dx())*scale), int(float64(b.Dy())*scale)
	ox, oy := (w-sw)/2, (h-sh)/2
	for y := 0; y < sh; y++ {
		for x := 0; x < sw; x++ {
			c := img.At(b.Min.X+int(float64(x)/scale), b.Min.Y+int(float64(y)/scale))
			dst.Pix[(oy+y)*dst.Stride+ox+x] = color.GrayModel.Convert(c).(color.Gray).Y
		}
	}
	return dst
}

func rotate90(img image.Image) image.Image {
	b := img.Bounds()
	out := image.NewGray(image.Rect(0, 0, b.Dy(), b.Dx()))
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			out.Set(b.Max.Y-1-y, x-b.Min.X, color.GrayModel.Convert(img.At(x, y)))
		}
	}
	return out
}

/* ---------- framebuffer ---------- */

type fbInfo struct {
	xres, yres, xoff, yoff, bpp, lineLen int
}

func readFBInfo() (fbInfo, *os.File, error) {
	f, err := os.Open("/dev/fb0")
	if err != nil {
		return fbInfo{}, nil, err
	}
	var v [40]uint32 // struct fb_var_screeninfo (160 bytes)
	if _, _, e := syscall.Syscall(syscall.SYS_IOCTL, f.Fd(), 0x4600, uintptr(unsafe.Pointer(&v))); e != 0 {
		f.Close()
		return fbInfo{}, nil, e
	}
	var fix [80]byte // struct fb_fix_screeninfo; line_length sits at byte 44 on 32-bit ARM
	if _, _, e := syscall.Syscall(syscall.SYS_IOCTL, f.Fd(), 0x4602, uintptr(unsafe.Pointer(&fix))); e != 0 {
		f.Close()
		return fbInfo{}, nil, e
	}
	return fbInfo{
		xres: int(v[0]), yres: int(v[1]), xoff: int(v[4]), yoff: int(v[5]), bpp: int(v[6]),
		lineLen: int(binary.LittleEndian.Uint32(fix[44:])),
	}, f, nil
}

var cachedW, cachedH int

func ScreenSize() (int, int) {
	if cachedW == 0 {
		cachedW, cachedH = 1072, 1448 // Paperwhite-class fallback
		if fb, f, err := readFBInfo(); err == nil {
			f.Close()
			cachedW, cachedH = fb.xres, fb.yres
		}
	}
	return cachedW, cachedH
}

// Screenshot returns what's on the e-ink panel right now as greyscale.
func Screenshot() (*image.Gray, error) {
	fb, f, err := readFBInfo()
	if err != nil {
		return nil, err
	}
	defer f.Close()
	raw := make([]byte, fb.lineLen*fb.yres)
	if _, err := f.ReadAt(raw, int64(fb.yoff*fb.lineLen)); err != nil {
		return nil, err
	}
	img := image.NewGray(image.Rect(0, 0, fb.xres, fb.yres))
	for y := 0; y < fb.yres; y++ {
		row := raw[y*fb.lineLen:]
		for x := 0; x < fb.xres; x++ {
			var g uint8
			switch fb.bpp {
			case 8:
				g = row[fb.xoff+x]
			case 16:
				p := binary.LittleEndian.Uint16(row[(fb.xoff+x)*2:])
				r, gg, b := (p>>11)&31, (p>>5)&63, p&31
				g = uint8((uint32(r)*8*299 + uint32(gg)*4*587 + uint32(b)*8*114) / 1000)
			case 32:
				i := (fb.xoff + x) * 4
				g = uint8((uint32(row[i+2])*299 + uint32(row[i+1])*587 + uint32(row[i])*114) / 1000)
			default:
				return nil, fmt.Errorf("unsupported %d bpp", fb.bpp)
			}
			img.Pix[y*img.Stride+x] = g
		}
	}
	return img, nil
}

func WifiIP() string {
	out, err := exec.Command("ifconfig", "wlan0").Output()
	if err != nil {
		return ""
	}
	for _, f := range strings.Fields(string(out)) {
		if strings.HasPrefix(f, "addr:") {
			return strings.TrimPrefix(f, "addr:")
		}
	}
	return ""
}
