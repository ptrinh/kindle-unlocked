package main

// Monitor: up/down checks for websites (HTTP) and servers (TCP port), with a
// little history bar per check and optional ntfy alerts on changes.

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type check struct {
	Name string `json:"name"`
	URL  string `json:"url,omitempty"`  // HTTP(S): up when it answers < 400
	Host string `json:"host,omitempty"` // or TCP: up when host:port accepts a connection
	Port int    `json:"port,omitempty"`
}

type monitorConfig struct {
	Title    string  `json:"title"`
	Checks   []check `json:"checks"`
	Ntfy     string  `json:"ntfy"` // optional: https://ntfy.sh/your-topic for alerts
	Lang     string  `json:"lang"`
	Timezone string  `json:"timezone"`
	Interval int     `json:"interval_seconds"`
}

type result struct {
	up      bool
	latency time.Duration
	err     string
}

type monitor struct {
	history map[string][]bool
	last    map[string]bool
}

func (*monitor) defaults() any {
	return monitorConfig{
		Title: "Status",
		Checks: []check{
			{Name: "Google", URL: "https://www.google.com"},
			{Name: "Cloudflare DNS", Host: "1.1.1.1", Port: 53},
		},
		Lang: "en", Interval: 60,
	}
}

func runCheck(ch check) result {
	start := time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if ch.URL != "" {
		req, err := http.NewRequestWithContext(ctx, "GET", ch.URL, nil)
		if err != nil {
			return result{err: err.Error()}
		}
		res, err := client.Do(req)
		if err != nil {
			return result{err: shortErr(err)}
		}
		io.Copy(io.Discard, io.LimitReader(res.Body, 1<<20))
		res.Body.Close()
		if res.StatusCode >= 400 {
			return result{latency: time.Since(start), err: res.Status}
		}
		return result{up: true, latency: time.Since(start)}
	}
	var d net.Dialer
	conn, err := d.DialContext(ctx, "tcp", net.JoinHostPort(ch.Host, fmt.Sprint(ch.Port)))
	if err != nil {
		return result{err: shortErr(err)}
	}
	conn.Close()
	return result{up: true, latency: time.Since(start)}
}

func shortErr(err error) string {
	s := err.Error()
	if i := strings.LastIndex(s, ": "); i >= 0 {
		s = s[i+2:]
	}
	return s
}

func (m *monitor) render(c *Canvas, cfgPath string) (time.Duration, error) {
	var cfg monitorConfig
	if err := readConfig(cfgPath, &cfg); err != nil {
		return 0, err
	}
	if m.history == nil {
		m.history, m.last = map[string][]bool{}, map[string]bool{}
	}
	now := time.Now().In(location(cfg.Timezone))
	lang := cfg.Lang

	results := make([]result, len(cfg.Checks))
	var wg sync.WaitGroup
	for i, ch := range cfg.Checks {
		wg.Add(1)
		go func(i int, ch check) { defer wg.Done(); results[i] = runCheck(ch) }(i, ch)
	}
	wg.Wait()

	down := 0
	for i, ch := range cfg.Checks {
		r := results[i]
		key := ch.Name + ch.URL + ch.Host
		h := append(m.history[key], r.up)
		if len(h) > 48 {
			h = h[len(h)-48:]
		}
		m.history[key] = h
		if prev, seen := m.last[key]; seen && prev != r.up {
			alert(cfg.Ntfy, ch.Name, r, lang)
		}
		m.last[key] = r.up
		if !r.up {
			down++
		}
	}

	y := header(c, cfg.Title, now)
	mg := int(c.U * 6)
	// Summary banner: black when something is down so it's visible from afar.
	bh := int(c.U * 14)
	summary := T(lang, "All systems up", "Mọi thứ đều ổn", "全部正常")
	if down > 0 {
		summary = fmt.Sprintf(T(lang, "%d down", "%d dịch vụ lỗi", "%d 个故障"), down)
		c.Box(mg, y, c.W-2*mg, bh, int(c.U*3), 1, 0, 0)
		c.TextCenter(c.F(6, true), c.W/2, y+int(c.U*3.5), summary, 255)
	} else {
		c.Box(mg, y, c.W-2*mg, bh, int(c.U*3), max(2, int(c.U*0.5)), 0, -1)
		c.TextCenter(c.F(6, true), c.W/2, y+int(c.U*3.5), summary, 0)
	}
	y += bh + int(c.U*5)

	nf, sf := c.F(4.4, true), c.F(3, false)
	rowH := int(c.U * 13)
	for i, ch := range cfg.Checks {
		if y+rowH > c.H-int(c.U*10) {
			break
		}
		r := results[i]
		key := ch.Name + ch.URL + ch.Host
		dotR := int(c.U * 1.8)
		c.Dot(mg+dotR, y+int(c.U*3.2), dotR, r.up)
		x := mg + dotR*2 + int(c.U*3)
		c.Text(nf, x, y, c.Ellipsize(nf, ch.Name, c.W*55/100-x), 0)
		detail := fmt.Sprintf("%d ms", r.latency.Milliseconds())
		if !r.up {
			detail = r.err
		}
		c.Text(sf, x, y+int(c.U*6), c.Ellipsize(sf, detail, c.W*55/100-x), map[bool]uint8{true: 110, false: 0}[r.up])

		// History: one bar per check, newest on the right; short bars = down.
		h := m.history[key]
		bw := max(2, int(c.U*0.75))
		right := c.W - mg
		bx := right - 48*(bw+bw/2)
		ups := 0
		for j, ok := range h {
			px := bx + (48-len(h)+j)*(bw+bw/2)
			if ok {
				ups++
				c.Fill(px, y+int(c.U*1), bw, int(c.U*5), 0)
			} else {
				c.Fill(px, y+int(c.U*5), bw, int(c.U*1), 0)
			}
		}
		pct := fmt.Sprintf("%.0f%%", 100*float64(ups)/float64(max(1, len(h))))
		c.TextRight(sf, right, y+int(c.U*7), pct, 110)
		y += rowH
	}
	footer(c, T(lang, "Checked ", "Kiểm tra lúc ", "检查于 ")+now.Format("15:04"))
	return time.Duration(max(cfg.Interval, 15)) * time.Second, nil
}

func alert(ntfy, name string, r result, lang string) {
	if ntfy == "" {
		return
	}
	title := fmt.Sprintf(T(lang, "%s is back up", "%s đã hoạt động lại", "%s 已恢复"), name)
	tag := "white_check_mark"
	if !r.up {
		title = fmt.Sprintf(T(lang, "%s is down", "%s đang lỗi", "%s 故障"), name)
		tag = "rotating_light"
	}
	req, err := http.NewRequest("POST", ntfy, strings.NewReader(r.err))
	if err != nil {
		return
	}
	req.Header.Set("Title", title)
	req.Header.Set("Tags", tag)
	if res, err := client.Do(req); err == nil {
		res.Body.Close()
	}
}

func jsonDecode(r io.Reader, v any) error { return json.NewDecoder(r).Decode(v) }
