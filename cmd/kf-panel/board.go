package main

// Family message board. People send notes and photos from
// kindle.trinh.uk/b/<id>; the page renders them at this Kindle's resolution
// and we just fetch and show the newest one.

import (
	"crypto/rand"
	"fmt"
	"image"
	"image/draw"
	"net/url"
	"time"

	qrcode "github.com/skip2/go-qrcode"
)

type boardConfig struct {
	Server   string `json:"server"`
	ID       string `json:"id"`
	Name     string `json:"name"` // shown on the sending page, e.g. "Grandma's kitchen"
	Lang     string `json:"lang"` // en | vi | zh
	Interval int    `json:"interval_seconds"`
}

type board struct{ seq int }

func (b *board) defaults() any {
	return boardConfig{Server: "https://kindle.trinh.uk", ID: randomID(), Name: "Kindle", Lang: "en", Interval: 60}
}

func randomID() string {
	const abc = "abcdefghjkmnpqrstuvwxyz23456789"
	buf := make([]byte, 12)
	rand.Read(buf)
	for i := range buf {
		buf[i] = abc[int(buf[i])%len(abc)]
	}
	return string(buf)
}

func (b *board) render(c *Canvas, cfgPath string) (time.Duration, error) {
	var cfg boardConfig
	if err := readConfig(cfgPath, &cfg); err != nil {
		return 0, err
	}
	wait := time.Duration(max(cfg.Interval, 15)) * time.Second

	q := url.Values{"w": {fmt.Sprint(c.W)}, "h": {fmt.Sprint(c.H)}, "name": {cfg.Name}}
	var latest struct {
		Seq int    `json:"seq"`
		URL string `json:"url"`
	}
	err := getJSON(cfg.Server+"/api/board/"+cfg.ID+"/latest?"+q.Encode(), nil, &latest)
	if err == nil && latest.Seq > 0 {
		img, err := decodeImage(cfg.Server + latest.URL)
		if err == nil {
			draw.Draw(c.Gray, c.Bounds(), img, img.Bounds().Min, draw.Src)
			return wait, nil
		}
	}

	// Nothing posted yet (or offline): show how to send something.
	link := cfg.Server + "/b/" + cfg.ID
	m := int(c.U * 8)
	c.TextCenter(c.F(8, true), c.W/2, m*2, cfg.Name, 0)
	c.TextCenter(c.F(4, false), c.W/2, m*2+int(c.U*12), T(cfg.Lang, "Message board", "Bảng tin", "留言板"), 80)
	size := c.W * 6 / 10
	if qr, qerr := qrcode.New(link, qrcode.Medium); qerr == nil {
		qr.DisableBorder = true
		img := qr.Image(size)
		top := m*2 + int(c.U*24)
		draw.Draw(c.Gray, img.Bounds().Add(image.Pt((c.W-size)/2, top)), img, img.Bounds().Min, draw.Src)
		y := top + size + int(c.U*8)
		c.TextCenter(c.F(4.4, true), c.W/2, y, T(cfg.Lang, "Scan to send a message or photo", "Quét để gửi lời nhắn hoặc ảnh", "扫码发送留言或照片"), 0)
		c.TextCenter(c.F(3.2, false), c.W/2, y+int(c.U*8), link, 90)
	}
	if err != nil {
		footer(c, T(cfg.Lang, "Offline — retrying", "Mất mạng — đang thử lại", "离线 — 正在重试"))
	}
	return wait, nil
}
