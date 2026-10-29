package main

// A tiny drawing kit for e-ink panels: fonts with per-character fallback
// (so Vietnamese and Chinese render when the Kindle has the glyphs), text
// wrapping, boxes and lines on an 8-bit grey canvas.

import (
	"image"
	"image/color"
	"image/draw"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"unicode"

	"golang.org/x/image/font"
	"golang.org/x/image/font/gofont/gobold"
	"golang.org/x/image/font/gofont/goregular"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/font/sfnt"
	"golang.org/x/image/math/fixed"
)

// Typeface is an ordered list of fonts; each character uses the first that has it.
type Typeface struct{ fonts []*sfnt.Font }

var fontDirs = []string{"/usr/java/lib/fonts", "/usr/share/fonts", "/var/local/font"}

// loadTypefaces finds fonts: the user's own (<ku>/fonts) first, then the
// Kindle's, then Go's bundled fonts as a last resort.
func loadTypefaces(ku string) (regular, bold *Typeface) {
	var user, system []string
	user, _ = globFonts(filepath.Join(ku, "fonts"))
	for _, d := range fontDirs {
		f, _ := globFonts(d)
		system = append(system, f...)
	}
	// Prefer Amazon's Latin UI fonts, then everything else (CJK etc).
	rank := func(p string) int {
		n := strings.ToLower(filepath.Base(p))
		switch {
		case strings.Contains(n, "ember"):
			return 0
		case strings.Contains(n, "bookerly"):
			return 1
		}
		return 2
	}
	sort.SliceStable(system, func(i, j int) bool { return rank(system[i]) < rank(system[j]) })
	paths := append(user, system...)

	isBold := func(p string) bool { return strings.Contains(strings.ToLower(filepath.Base(p)), "bold") }
	isItalic := func(p string) bool {
		n := strings.ToLower(filepath.Base(p))
		return strings.Contains(n, "italic") || strings.Contains(n, "oblique")
	}
	regular, bold = &Typeface{}, &Typeface{}
	for _, p := range paths {
		if isItalic(p) {
			continue
		}
		fs := parseFontFile(p)
		if isBold(p) {
			bold.fonts = append(bold.fonts, fs...)
		} else {
			regular.fonts = append(regular.fonts, fs...)
		}
	}
	gr, _ := opentype.Parse(goregular.TTF)
	gb, _ := opentype.Parse(gobold.TTF)
	// Bold falls back to regular fonts (e.g. CJK files rarely come in bold).
	bold.fonts = append(bold.fonts, gb)
	bold.fonts = append(bold.fonts, regular.fonts...)
	regular.fonts = append(regular.fonts, gr)
	return regular, bold
}

func globFonts(dir string) ([]string, error) {
	var out []string
	err := filepath.Walk(dir, func(p string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		switch strings.ToLower(filepath.Ext(p)) {
		case ".ttf", ".otf", ".ttc":
			out = append(out, p)
		}
		return nil
	})
	return out, err
}

func parseFontFile(p string) []*sfnt.Font {
	b, err := os.ReadFile(p)
	if err != nil {
		return nil
	}
	if strings.EqualFold(filepath.Ext(p), ".ttc") {
		c, err := opentype.ParseCollection(b)
		if err != nil {
			return nil
		}
		var fs []*sfnt.Font
		for i := 0; i < c.NumFonts(); i++ {
			if f, err := c.Font(i); err == nil {
				fs = append(fs, f)
			}
		}
		return fs
	}
	f, err := opentype.Parse(b)
	if err != nil {
		return nil
	}
	return []*sfnt.Font{f}
}

// Face is a Typeface at one size.
type Face struct {
	fonts []*sfnt.Font
	faces []font.Face
	buf   sfnt.Buffer
	cache map[rune]int
	size  float64
}

func (t *Typeface) Face(size float64) *Face {
	f := &Face{fonts: t.fonts, faces: make([]font.Face, len(t.fonts)), cache: map[rune]int{}, size: size}
	return f
}

func (f *Face) pick(r rune) font.Face {
	i, ok := f.cache[r]
	if !ok {
		i = len(f.fonts) - 1
		for j, fn := range f.fonts {
			if g, err := fn.GlyphIndex(&f.buf, r); err == nil && g != 0 {
				i = j
				break
			}
		}
		f.cache[r] = i
	}
	if f.faces[i] == nil {
		f.faces[i], _ = opentype.NewFace(f.fonts[i], &opentype.FaceOptions{Size: f.size, DPI: 72, Hinting: font.HintingFull})
	}
	return f.faces[i]
}

func (f *Face) Width(s string) int {
	var w fixed.Int26_6
	for _, r := range s {
		a, _ := f.pick(r).GlyphAdvance(r)
		w += a
	}
	return w.Ceil()
}

// Ascent is the distance from the top of a line to its baseline.
func (f *Face) Ascent() int { return int(f.size * 0.82) }
func (f *Face) LineHeight() int {
	return int(f.size * 1.25)
}

/* ---------- canvas ---------- */

type Canvas struct {
	*image.Gray
	W, H      int
	U         float64 // 1% of the width; all sizes are multiples of it
	reg, bold *Typeface
	faces     map[[2]int]*Face
}

func NewCanvas(w, h int, reg, bold *Typeface) *Canvas {
	img := image.NewGray(image.Rect(0, 0, w, h))
	draw.Draw(img, img.Bounds(), image.White, image.Point{}, draw.Src)
	return &Canvas{Gray: img, W: w, H: h, U: float64(w) / 100, reg: reg, bold: bold, faces: map[[2]int]*Face{}}
}

// Clear paints the canvas white again, so it can be reused for the next frame.
func (c *Canvas) Clear() {
	for i := range c.Pix {
		c.Pix[i] = 255
	}
}

// F returns a face whose size is `size` units (1 unit = 1% of screen width).
func (c *Canvas) F(size float64, bold bool) *Face {
	px := int(size * c.U)
	k := [2]int{px, map[bool]int{false: 0, true: 1}[bold]}
	if f, ok := c.faces[k]; ok {
		return f
	}
	t := c.reg
	if bold {
		t = c.bold
	}
	f := t.Face(float64(px))
	c.faces[k] = f
	return f
}

// Text draws s with its top-left at (x, y) and returns its width.
func (c *Canvas) Text(f *Face, x, y int, s string, grey uint8) int {
	src := image.NewUniform(color.Gray{grey})
	dot := fixed.P(x, y+f.Ascent())
	for _, r := range s {
		face := f.pick(r)
		dr, mask, mp, adv, ok := face.Glyph(dot, r)
		if ok {
			draw.DrawMask(c.Gray, dr, src, image.Point{}, mask, mp, draw.Over)
		}
		dot.X += adv
	}
	return dot.X.Ceil() - x
}

func (c *Canvas) TextRight(f *Face, right, y int, s string, grey uint8) {
	c.Text(f, right-f.Width(s), y, s, grey)
}

func (c *Canvas) TextCenter(f *Face, cx, y int, s string, grey uint8) {
	c.Text(f, cx-f.Width(s)/2, y, s, grey)
}

// Ellipsize shortens s to fit maxW.
func (c *Canvas) Ellipsize(f *Face, s string, maxW int) string {
	if f.Width(s) <= maxW {
		return s
	}
	rs := []rune(s)
	for len(rs) > 0 && f.Width(string(rs)+"…") > maxW {
		rs = rs[:len(rs)-1]
	}
	return strings.TrimSpace(string(rs)) + "…"
}

// Wrap splits s into lines no wider than maxW. Words break on spaces; CJK
// text breaks between any two characters.
func Wrap(f *Face, s string, maxW int) []string {
	var lines []string
	for _, para := range strings.Split(s, "\n") {
		line := ""
		for _, tok := range tokens(para) {
			test := line + tok
			if line != "" && f.Width(strings.TrimRight(test, " ")) > maxW {
				lines = append(lines, strings.TrimRight(line, " "))
				line = strings.TrimLeft(tok, " ")
				continue
			}
			line = test
		}
		lines = append(lines, strings.TrimRight(line, " "))
	}
	return lines
}

func tokens(s string) []string {
	var out []string
	cur := ""
	for _, r := range s {
		switch {
		case unicode.Is(unicode.Han, r) || unicode.Is(unicode.Hiragana, r) || unicode.Is(unicode.Katakana, r):
			if cur != "" {
				out = append(out, cur)
				cur = ""
			}
			out = append(out, string(r))
		case r == ' ':
			out = append(out, cur+" ")
			cur = ""
		default:
			cur += string(r)
		}
	}
	if cur != "" {
		out = append(out, cur)
	}
	return out
}

// Paragraph draws wrapped text and returns the y below it.
func (c *Canvas) Paragraph(f *Face, x, y, maxW int, s string, grey uint8, maxLines int) int {
	lines := Wrap(f, s, maxW)
	if maxLines > 0 && len(lines) > maxLines {
		lines = lines[:maxLines]
		lines[maxLines-1] = c.Ellipsize(f, lines[maxLines-1]+"…", maxW)
	}
	for _, l := range lines {
		c.Text(f, x, y, l, grey)
		y += f.LineHeight()
	}
	return y
}

func (c *Canvas) Fill(x, y, w, h int, grey uint8) {
	draw.Draw(c.Gray, image.Rect(x, y, x+w, y+h), image.NewUniform(color.Gray{grey}), image.Point{}, draw.Src)
}

func (c *Canvas) HLine(x, y, w, thick int, grey uint8) { c.Fill(x, y, w, thick, grey) }

// Box draws a rounded rectangle outline (or filled when fill >= 0).
func (c *Canvas) Box(x, y, w, h, r, thick int, line uint8, fill int) {
	for py := y; py < y+h; py++ {
		for px := x; px < x+w; px++ {
			dx, dy := 0, 0
			if px < x+r {
				dx = x + r - px
			} else if px >= x+w-r {
				dx = px - (x + w - r - 1)
			}
			if py < y+r {
				dy = y + r - py
			} else if py >= y+h-r {
				dy = py - (y + h - r - 1)
			}
			d2 := dx*dx + dy*dy
			if d2 > r*r {
				continue
			}
			edge := px < x+thick || px >= x+w-thick || py < y+thick || py >= y+h-thick ||
				(dx > 0 && dy > 0 && d2 > (r-thick)*(r-thick))
			switch {
			case edge:
				c.SetGray(px, py, color.Gray{line})
			case fill >= 0:
				c.SetGray(px, py, color.Gray{uint8(fill)})
			}
		}
	}
}

// Dot draws a filled (or hollow) circle, used as status lights.
func (c *Canvas) Dot(cx, cy, r int, filled bool) {
	for y := -r; y <= r; y++ {
		for x := -r; x <= r; x++ {
			d := x*x + y*y
			if d <= r*r && (filled || d >= (r-max(2, r/4))*(r-max(2, r/4))) {
				c.SetGray(cx+x, cy+y, color.Gray{0})
			}
		}
	}
}
