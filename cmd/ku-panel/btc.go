package main

// BTC Ticker: big Bitcoin price, 24h change, a 7-day chart and a few network
// numbers, drawn natively (no browser) so it can run for months. Everything
// that changes slowly (chart, block height, exchange rate) is fetched rarely
// and kept between renders; when the network is down the last numbers stay
// up with an "offline" note instead of an error screen.

import (
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"math"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"golang.org/x/image/font/gofont/gomonobold"
	"golang.org/x/image/font/gofont/gomonobolditalic"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/font/sfnt"

	"kindle.trinh.uk/unlocked/internal/kindle"
)

type btcConfig struct {
	Symbol    string `json:"symbol"`   // Binance pair, e.g. BTCUSDT
	Currency  string `json:"currency"` // any ISO 4217 code, shown as USDT/<code>
	Landscape bool   `json:"landscape"`
	Lang      string `json:"lang"`
	Timezone  string `json:"timezone"`
	Interval  int    `json:"interval_seconds"`
	// A full (flashing) refresh every N minutes clears e-ink ghosting.
	FullRefresh int `json:"full_refresh_minutes"`
}

type btcTicker struct {
	cfg btcConfig

	// Last good values, kept when a fetch fails.
	price, open, high, low, change, volume float64
	prev                                   float64 // price before the last update, for the arrow
	priceAt                                time.Time

	chart   []float64 // hourly closes, last 7 days
	chartAt time.Time

	height     int
	difficulty float64
	chainAt    time.Time

	rate     float64 // 1 USD in cfg.Currency
	rateCode string
	rateErr  string
	rateAt   time.Time

	fetchedAt         time.Time
	priceBox, exitBox image.Rectangle // tap targets, in canvas pixels
	cfgPath           string

	reg, bold *Typeface
	sysFonts  bool // the Kindle's fonts were added for a non-English language
}

func (*btcTicker) defaults() any {
	return btcConfig{Symbol: "BTCUSDT", Currency: "VND", Landscape: true, Lang: "en", Interval: 30, FullRefresh: 30}
}

// Monospace italic digits, like the classic hodl.bar ticker. They're bundled,
// so in English the Kindle's (large) font files are never loaded; other
// languages fall back to them for their letters.
func (b *btcTicker) typefaces(cfgPath string) (*Typeface, *Typeface) {
	mono, _ := opentype.Parse(gomonobold.TTF)
	it, _ := opentype.Parse(gomonobolditalic.TTF)
	b.reg, b.bold = &Typeface{fonts: []*sfnt.Font{mono}}, &Typeface{fonts: []*sfnt.Font{it}}
	cfg := btcConfig{Lang: "en"}
	readConfig(cfgPath, &cfg)
	b.useLang(cfg.Lang)
	return b.reg, b.bold
}

// useLang adds the Kindle's fonts (once) when the language needs letters
// the bundled mono font lacks. It reports whether the fonts changed.
func (b *btcTicker) useLang(lang string) bool {
	if lang == "" || lang == "en" || b.sysFonts || b.reg == nil {
		return false
	}
	r, bo := loadTypefaces(kuDir)
	b.reg.fonts = append(b.reg.fonts, r.fonts...)
	b.bold.fonts = append(b.bold.fonts, bo.fonts...)
	b.sysFonts = true
	return true
}

func (b *btcTicker) landscape(cfgPath string) bool {
	cfg := btcConfig{Landscape: true}
	readConfig(cfgPath, &cfg)
	return cfg.Landscape
}

// tap: the price turns the screen; × closes the ticker.
func (b *btcTicker) tap(c *Canvas, p image.Point) bool {
	switch {
	case p.In(b.exitBox):
		c.Clear()
		c.TextCenter(c.F(6, true), c.W/2, c.H/2, "Bye", 0)
		kindle.Show(c.Gray, true, os.TempDir()+"/ku-panel.png")
		exitPanel(panelMode)
	case p.In(b.priceBox):
		b.cfg.Landscape = !b.cfg.Landscape
		if j, err := json.MarshalIndent(b.cfg, "", "  "); err == nil {
			os.WriteFile(b.cfgPath, append(j, '\n'), 0644)
		}
		return true
	}
	return false
}

func (b *btcTicker) fullRefresh() time.Duration {
	return time.Duration(max(b.cfg.FullRefresh, 5)) * time.Minute
}

var isoCode = regexp.MustCompile(`^[A-Z]{3}$`)

func (b *btcTicker) fetch(now time.Time) {
	sym := b.cfg.Symbol
	var t struct {
		Last   string `json:"lastPrice"`
		Open   string `json:"openPrice"`
		High   string `json:"highPrice"`
		Low    string `json:"lowPrice"`
		Change string `json:"priceChangePercent"`
		Volume string `json:"volume"`
	}
	if getJSON("https://api.binance.com/api/v3/ticker/24hr?symbol="+sym, nil, &t) == nil {
		if p := num(t.Last); p > 0 {
			if b.price > 0 && p != b.price {
				b.prev = b.price
			}
			b.price, b.open, b.high, b.low = p, num(t.Open), num(t.High), num(t.Low)
			b.change, b.volume, b.priceAt = num(t.Change), num(t.Volume), now
		}
	}

	if now.Sub(b.chartAt) >= 10*time.Minute {
		var k [][]any
		if getJSON("https://api.binance.com/api/v3/klines?interval=1h&limit=168&symbol="+sym, nil, &k) == nil && len(k) > 1 {
			closes := b.chart[:0]
			for _, row := range k {
				if len(row) > 4 {
					if s, ok := row[4].(string); ok {
						closes = append(closes, num(s))
					}
				}
			}
			b.chart, b.chartAt = closes, now
		}
	}

	if now.Sub(b.chainAt) >= 10*time.Minute {
		var c struct {
			Height     int     `json:"n_blocks_total"`
			Difficulty float64 `json:"difficulty"`
		}
		if getJSON("https://api.blockchain.info/stats", nil, &c) == nil && c.Height > 0 {
			b.height, b.difficulty, b.chainAt = c.Height, c.Difficulty, now
		}
	}

	code := strings.ToUpper(strings.TrimSpace(b.cfg.Currency))
	if code != b.rateCode {
		b.rate, b.rateCode, b.rateErr, b.rateAt = 0, code, "", time.Time{}
	}
	if code != "" && code != "USD" && now.Sub(b.rateAt) >= 6*time.Hour {
		if !isoCode.MatchString(code) {
			b.rateErr = "?"
			b.rateAt = now
		} else {
			var r struct {
				Result string             `json:"result"`
				Rates  map[string]float64 `json:"rates"`
			}
			if getJSON("https://open.er-api.com/v6/latest/USD", nil, &r) == nil && r.Result == "success" {
				b.rate, b.rateErr, b.rateAt = r.Rates[code], "", now
				if b.rate == 0 {
					b.rateErr = "?" // unknown code: don't ask again for 6 hours
				}
			}
		}
	}
}

func (b *btcTicker) render(c *Canvas, cfgPath string) (time.Duration, error) {
	cfg := btcConfig{Symbol: "BTCUSDT", Interval: 30, FullRefresh: 30}
	if err := readConfig(cfgPath, &cfg); err != nil {
		return 0, err
	}
	if cfg.Symbol = strings.ToUpper(strings.TrimSpace(cfg.Symbol)); cfg.Symbol == "" {
		cfg.Symbol = "BTCUSDT"
	}
	if cfg.Symbol != b.cfg.Symbol {
		b.price, b.prev, b.chart, b.chartAt = 0, 0, nil, time.Time{}
	}
	if b.useLang(cfg.Lang) {
		clear(c.faces) // rebuild faces with the new fallback fonts
	}
	changed := cfg != b.cfg
	b.cfg, b.cfgPath = cfg, cfgPath
	wait := time.Duration(max(cfg.Interval, 15)) * time.Second
	now := time.Now()
	// A tap redraws at once without hitting the network; new settings fetch.
	if changed || now.Sub(b.fetchedAt) >= wait/2 {
		b.fetch(now)
		b.fetchedAt = now
	}
	if b.price == 0 {
		return 0, fmt.Errorf("%s", T(cfg.Lang,
			"Can't reach Binance yet. Check the Wi-Fi; this screen retries every minute.",
			"Chưa kết nối được Binance. Kiểm tra Wi-Fi; màn hình này tự thử lại mỗi phút.",
			"暂时连不上 Binance。请检查 Wi-Fi，此屏幕每分钟自动重试。"))
	}
	b.draw(c, now.In(location(cfg.Timezone)), wait)
	return wait, nil
}

func (b *btcTicker) draw(c *Canvas, now time.Time, wait time.Duration) {
	lang := b.cfg.Lang
	W, H := c.W, c.H
	u := float64(min(W, H)) / 100 // sizes scale with the short side
	m := int(u * 5)
	grey := uint8(120)

	// Header: change pill + arrow on the left, 24h high / low on the right.
	pf := c.F(7*u/c.U, true)
	pct := fmt.Sprintf("%+.2f%%", b.change)
	pw, ph := pf.Width(pct)+int(u*6), pf.LineHeight()+int(u*1)
	c.Box(m, m, pw, ph, ph/2, max(3, int(u*0.8)), 0, -1)
	c.Text(pf, m+int(u*3), m+int(u*0.8), pct, 0)
	if b.prev > 0 {
		arrow(c, m+pw+int(u*3), m+ph/2, int(u*3), b.price > b.prev)
	}
	// × (close) in the top-right corner, with a generous tap area.
	xr := ph / 2
	xc := image.Pt(W-m-xr, m+ph/2)
	c.Box(xc.X-xr, xc.Y-xr, 2*xr, 2*xr, xr, max(2, int(u*0.5)), grey, -1)
	for d := -xr / 3; d <= xr/3; d++ {
		th := max(2, int(u*0.6))
		c.Fill(xc.X+d, xc.Y+d, th, th, grey)
		c.Fill(xc.X+d, xc.Y-d, th, th, grey)
	}
	b.exitBox = image.Rect(W-m-2*xr-int(u*4), 0, W, m+ph+int(u*4))
	hl := fmt.Sprintf("H %s  L %s", commas(b.high, 0), commas(b.low, 0))
	hlRight, hlLeft := W-m-2*xr-int(u*4), m+pw+int(u*9)
	hs := 5.0
	hf := c.F(hs*u/c.U, true)
	for hf.Width(hl) > hlRight-hlLeft && hs > 2.5 {
		hs -= 0.25
		hf = c.F(hs*u/c.U, true)
	}
	c.TextRight(hf, hlRight, m+(ph-hf.LineHeight())/2+int(u*0.5), hl, grey)

	// Price: as large as fits.
	whole := commas(b.price, 0)
	size := float64(H) * 0.26
	if W < H {
		size = float64(H) * 0.17
	}
	f := c.F(size/c.U, true)
	for f.Width(whole) > W-2*m && size > 10 {
		size *= 0.95
		f = c.F(size/c.U, true)
	}
	py := m + ph + int(u*3)
	c.TextCenter(f, W/2, py, whole, 0)
	b.priceBox = image.Rect(m, py, W-m, py+int(size*1.1))
	df := c.F(5*u/c.U, true)
	dec := fmt.Sprintf(".%02d", int(math.Round(b.price*100))%100)
	right := W/2 + f.Width(whole)/2
	py += int(size * 0.95)
	c.TextRight(df, right, py, dec, grey)
	py += df.LineHeight()

	// Table: two rows of three.
	sf, vf := c.F(3*u/c.U, true), c.F(5.6*u/c.U, true)
	cellH := sf.LineHeight() + vf.LineHeight() + int(u*2)
	tableY := H - m - int(u*4) - 2*cellH
	code := b.rateCode
	if code == "" {
		code = "USD"
	}
	fx := "—"
	switch {
	case code == "USD":
		fx = "1.00"
	case b.rateErr != "":
		fx = T(lang, "bad code", "sai mã", "代码无效")
	case b.rate > 0:
		fx = commas(b.rate, decimalsFor(b.rate))
	}
	cells := [6][2]string{
		{T(lang, "Sats per USD", "Sats / USD", "每美元聪数"), commas(1e8/b.price, 0)},
		{T(lang, "Block height", "Khối", "区块高度"), dash(b.height > 0, commas(float64(b.height), 0))},
		{T(lang, "Market cap", "Vốn hoá", "市值"), dash(b.height > 0, fmt.Sprintf("%.3fT", minedCoins(b.height)*b.price/1e12))},
		{"USDT/" + code, fx},
		{T(lang, "24h vol (BTC)", "KL 24h (BTC)", "24h 成交量 (BTC)"), commas(b.volume, 0)},
		{T(lang, "Difficulty", "Độ khó", "难度"), dash(b.difficulty > 0, fmt.Sprintf("%.2fT", b.difficulty/1e12))},
	}
	colW := (W - 2*m) / 3
	for i, cell := range cells {
		x, y := m+(i%3)*colW, tableY+(i/3)*cellH
		c.Text(sf, x, y, c.Ellipsize(sf, cell[0], colW-int(u*2)), grey)
		c.Text(vf, x, y+sf.LineHeight(), c.Ellipsize(vf, cell[1], colW-int(u*2)), 0)
	}

	// Chart fills the space between the price and the table.
	b.drawChart(c, m, py+int(u*2), W-2*m, tableY-py-int(u*6), sf, grey)

	// Footer: update time (or how stale the data is) and battery.
	ff := c.F(2.6*u/c.U, true)
	fy := H - m/2 - ff.LineHeight()
	status := b.cfg.Symbol + " · " + now.Format("2006-01-02 15:04")
	if time.Since(b.priceAt) > 3*wait {
		status = T(lang, "Offline since ", "Mất mạng từ ", "离线自 ") + b.priceAt.In(now.Location()).Format("15:04")
	}
	c.Text(ff, m, fy, status, grey)
	if bat := kindle.LipcGetInt(kindle.Powerd, "battLevel"); bat > 0 {
		c.TextRight(ff, W-m, fy, fmt.Sprintf("%d%%", bat), grey)
	}
}

func (b *btcTicker) drawChart(c *Canvas, x, y, w, h int, lf *Face, grey uint8) {
	if len(b.chart) < 2 || h < 20 {
		return
	}
	lo, hi := b.chart[0], b.chart[0]
	for _, v := range b.chart {
		lo, hi = min(lo, v), max(hi, v)
	}
	if hi == lo {
		hi = lo + 1
	}
	labelW := lf.Width("000.0k") + 6
	gx, gw := x+labelW, w-labelW
	c.Fill(gx, y, 2, h, 170)
	c.Fill(gx, y+h-2, gw, 2, 170)
	c.TextRight(lf, gx-6, y, kilo(hi), grey)
	c.TextRight(lf, gx-6, y+h-lf.LineHeight(), kilo(lo), grey)
	c.TextRight(lf, x+w, y+h+2, "7d", grey)

	thick := max(3, h/60)
	pt := func(i int) (int, int) {
		px := gx + 4 + i*(gw-8)/(len(b.chart)-1)
		py := y + 4 + int(float64(h-8-thick)*(hi-b.chart[i])/(hi-lo))
		return px, py
	}
	x0, y0 := pt(0)
	for i := 1; i < len(b.chart); i++ {
		x1, y1 := pt(i)
		c.Line(x0, y0, x1, y1, thick)
		x0, y0 = x1, y1
	}
}

// Line draws a thick black segment.
func (c *Canvas) Line(x0, y0, x1, y1, thick int) {
	steps := max(abs(x1-x0), abs(y1-y0), 1)
	for s := 0; s <= steps; s++ {
		c.Fill(x0+(x1-x0)*s/steps, y0+(y1-y0)*s/steps, thick, thick, 0)
	}
}

// arrow draws a filled up or down triangle centred at (cx, cy).
func arrow(c *Canvas, cx, cy, r int, up bool) {
	for dy := -r; dy <= r; dy++ {
		half := (dy + r) / 2
		if !up {
			half = (r - dy) / 2
		}
		for dx := -half; dx <= half; dx++ {
			c.SetGray(cx+dx, cy+dy, color.Gray{0})
		}
	}
}

func abs(v int) int {
	if v < 0 {
		return -v
	}
	return v
}

func num(s string) float64 {
	v, _ := strconv.ParseFloat(s, 64)
	return v
}

func dash(ok bool, s string) string {
	if ok {
		return s
	}
	return "—"
}

// commas formats v with thousands separators and d decimals.
func commas(v float64, d int) string {
	s := strconv.FormatFloat(v, 'f', d, 64)
	intPart, frac := s, ""
	if i := strings.IndexByte(s, '.'); i >= 0 {
		intPart, frac = s[:i], s[i:]
	}
	neg := strings.HasPrefix(intPart, "-")
	intPart = strings.TrimPrefix(intPart, "-")
	var out []byte
	for i := range intPart {
		if i > 0 && (len(intPart)-i)%3 == 0 {
			out = append(out, ',')
		}
		out = append(out, intPart[i])
	}
	if neg {
		return "-" + string(out) + frac
	}
	return string(out) + frac
}

func decimalsFor(v float64) int {
	switch {
	case v >= 1000:
		return 0
	case v >= 10:
		return 2
	}
	return 4
}

func kilo(v float64) string {
	if v >= 1000 {
		return fmt.Sprintf("%.1fk", v/1000)
	}
	return fmt.Sprintf("%.0f", v)
}

// minedCoins is the supply after a given block height.
func minedCoins(height int) float64 {
	reward, total := 50.0, 0.0
	for height > 0 && reward > 0 {
		n := min(height, 210000)
		total += float64(n) * reward
		height -= n
		reward /= 2
	}
	return total
}
