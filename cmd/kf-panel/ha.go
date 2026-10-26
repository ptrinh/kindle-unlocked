package main

// Home Assistant: a grid of entity cards, read over HA's REST API.

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

type haConfig struct {
	URL      string   `json:"url"`   // e.g. http://homeassistant.local:8123
	Token    string   `json:"token"` // Profile → Security → Long-lived access tokens
	Title    string   `json:"title"`
	Entities []string `json:"entities"` // e.g. ["sensor.living_room_temperature", "light.kitchen"]
	Lang     string   `json:"lang"`
	Timezone string   `json:"timezone"`
	Interval int      `json:"interval_seconds"`
}

type homeAssistant struct{}

func (homeAssistant) defaults() any {
	return haConfig{URL: "http://homeassistant.local:8123", Title: "Home", Entities: []string{}, Lang: "en", Interval: 60}
}

type haState struct {
	EntityID    string         `json:"entity_id"`
	State       string         `json:"state"`
	LastChanged time.Time      `json:"last_changed"`
	Attributes  map[string]any `json:"attributes"`
}

func (homeAssistant) render(c *Canvas, cfgPath string) (time.Duration, error) {
	var cfg haConfig
	if err := readConfig(cfgPath, &cfg); err != nil {
		return 0, err
	}
	if cfg.Token == "" {
		return time.Minute, fmt.Errorf("Add your Home Assistant URL and a long-lived access token to ha/config.json (Profile → Security → Long-lived access tokens), and list the entities to show.")
	}
	now := time.Now().In(location(cfg.Timezone))
	var states []haState
	err := getJSON(strings.TrimRight(cfg.URL, "/")+"/api/states", map[string]string{"Authorization": "Bearer " + cfg.Token}, &states)
	if err != nil {
		return time.Minute, err
	}
	byID := map[string]haState{}
	for _, s := range states {
		byID[s.EntityID] = s
	}
	ids := cfg.Entities
	if len(ids) == 0 { // nothing chosen yet: show some sensors so it isn't empty
		for _, s := range states {
			if strings.HasPrefix(s.EntityID, "sensor.") && len(ids) < 8 {
				ids = append(ids, s.EntityID)
			}
		}
	}

	y := header(c, cfg.Title, now)
	m := int(c.U * 6)
	gap := int(c.U * 3)
	cols := 2
	cw := (c.W - 2*m - gap) / cols
	ch := int(c.U * 26)
	for i, id := range ids {
		x := m + (i%cols)*(cw+gap)
		top := y + (i/cols)*(ch+gap)
		if top+ch > c.H-int(c.U*12) {
			break
		}
		s, ok := byID[id]
		name, value, unit := id, "—", ""
		on := false
		if ok {
			if n, _ := s.Attributes["friendly_name"].(string); n != "" {
				name = n
			}
			value = s.State
			unit, _ = s.Attributes["unit_of_measurement"].(string)
			on = s.State == "on" || s.State == "open" || s.State == "home" || s.State == "unlocked" || s.State == "playing"
		}
		// "On" things get a dark card so the state reads from across the room.
		bg, fg := -1, uint8(0)
		if on {
			bg, fg = 0, 255
		}
		c.Box(x, top, cw, ch, int(c.U*3), max(2, int(c.U*0.4)), 0, bg)
		p := int(c.U * 3.5)
		c.Text(c.F(3.4, false), x+p, top+p, c.Ellipsize(c.F(3.4, false), name, cw-2*p), fg)
		vf := c.F(9, true)
		val := prettyState(value, cfg.Lang)
		vw := c.Text(vf, x+p, top+int(c.U*9), c.Ellipsize(vf, val, cw-2*p-c.F(4, false).Width(unit)), fg)
		if unit != "" {
			c.Text(c.F(4, false), x+p+vw+int(c.U), top+int(c.U*13), unit, fg)
		}
		if ok {
			c.Text(c.F(2.6, false), x+p, top+ch-p-c.F(2.6, false).LineHeight(), ago(s.LastChanged, now, cfg.Lang), map[bool]uint8{true: 200, false: 110}[on])
		}
	}
	footer(c, T(cfg.Lang, "Updated ", "Cập nhật ", "更新于 ")+now.Format("15:04"))
	return time.Duration(max(cfg.Interval, 15)) * time.Second, nil
}

func prettyState(s, lang string) string {
	switch s {
	case "on":
		return T(lang, "On", "Bật", "开")
	case "off":
		return T(lang, "Off", "Tắt", "关")
	case "unavailable", "unknown":
		return "—"
	}
	if v, err := strconv.ParseFloat(s, 64); err == nil && strings.Contains(s, ".") {
		return strings.TrimSuffix(strings.TrimRight(fmt.Sprintf("%.1f", v), "0"), ".")
	}
	if s == "" {
		return "—"
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

func ago(t, now time.Time, lang string) string {
	d := now.Sub(t)
	switch {
	case d < time.Minute:
		return T(lang, "just now", "vừa xong", "刚刚")
	case d < time.Hour:
		return fmt.Sprintf(T(lang, "%d min ago", "%d phút trước", "%d 分钟前"), int(d.Minutes()))
	case d < 24*time.Hour:
		return fmt.Sprintf(T(lang, "%d h ago", "%d giờ trước", "%d 小时前"), int(d.Hours()))
	}
	return fmt.Sprintf(T(lang, "%d d ago", "%d ngày trước", "%d 天前"), int(d.Hours()/24))
}
