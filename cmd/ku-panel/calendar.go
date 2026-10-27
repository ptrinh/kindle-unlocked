package main

// Calendar: today's date, the agenda for the next days (from iCal links such
// as Google Calendar's "secret address in iCal format"), and Todoist tasks.

import (
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/apognu/gocal"
)

type calendarConfig struct {
	Title        string   `json:"title"`
	ICS          []string `json:"ics"` // iCal links (Google: Settings → calendar → "Secret address in iCal format")
	TodoistToken string   `json:"todoist_token"`
	Days         int      `json:"days"`
	Lang         string   `json:"lang"`
	Timezone     string   `json:"timezone"` // e.g. Asia/Ho_Chi_Minh
	Interval     int      `json:"interval_seconds"`
}

type calendar struct{}

func (calendar) defaults() any {
	return calendarConfig{Title: "", ICS: []string{}, Days: 5, Lang: "en", Timezone: "", Interval: 900}
}

type event struct {
	Start, End time.Time
	AllDay     bool
	Title      string
}

func (calendar) render(c *Canvas, cfgPath string) (time.Duration, error) {
	var cfg calendarConfig
	if err := readConfig(cfgPath, &cfg); err != nil {
		return 0, err
	}
	loc := location(cfg.Timezone)
	now := time.Now().In(loc)
	days := max(1, min(cfg.Days, 14))
	from := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
	to := from.AddDate(0, 0, days)

	var events []event
	var problems []string
	for _, u := range cfg.ICS {
		evs, err := fetchICS(u, from, to, loc)
		if err != nil {
			problems = append(problems, err.Error())
		}
		events = append(events, evs...)
	}
	sort.Slice(events, func(i, j int) bool { return events[i].Start.Before(events[j].Start) })
	tasks, terr := todoist(cfg.TodoistToken)
	if terr != nil {
		problems = append(problems, terr.Error())
	}

	m := int(c.U * 6)
	lang := cfg.Lang
	// Big date block.
	wd := weekday(now, lang)
	if cfg.Title != "" {
		wd += " · " + cfg.Title
	}
	c.Text(c.F(4.6, false), m, m, c.Ellipsize(c.F(4.6, false), wd, c.W*65/100), 60)
	c.TextRight(c.F(4.6, false), c.W-m, m, now.Format("15:04"), 0)
	df := c.F(13, true)
	c.Text(df, m, m+int(c.U*7), c.Ellipsize(df, dayMonth(now, lang), c.W-2*m), 0)
	y := m + int(c.U*24)
	c.HLine(m, y, c.W-2*m, max(2, int(c.U*0.5)), 0)
	y += int(c.U * 4)

	bottom := c.H - int(c.U*10)
	if len(tasks) > 0 {
		bottom -= int(c.U*8) + min(len(tasks), 6)*int(c.U*6)
	}
	if len(cfg.ICS) == 0 {
		y = c.Paragraph(c.F(3.6, false), m, y, c.W-2*m, T(lang,
			"Add iCal links to calendar/config.json. Google Calendar: Settings → your calendar → “Secret address in iCal format”.",
			"Thêm link iCal vào calendar/config.json. Google Calendar: Cài đặt → lịch của bạn → “Địa chỉ bí mật ở định dạng iCal”.",
			"在 calendar/config.json 中添加 iCal 链接。Google 日历：设置 → 你的日历 → “iCal 格式的私密地址”。"), 60, 6)
	}

	tf, bf, sf := c.F(4.2, false), c.F(4.2, true), c.F(3.2, true)
	for d := 0; d < days && y < bottom; d++ {
		day := from.AddDate(0, 0, d)
		var todays []event
		for _, e := range events {
			if e.Start.Before(day.AddDate(0, 0, 1)) && e.End.After(day) {
				todays = append(todays, e)
			}
		}
		if len(todays) == 0 && d > 1 {
			continue
		}
		label := relDay(d, day, lang)
		c.Text(sf, m, y, strings.ToUpper(label), 90)
		y += sf.LineHeight() + int(c.U)
		if len(todays) == 0 {
			c.Text(tf, m, y, T(lang, "Nothing planned", "Không có lịch", "暂无安排"), 140)
			y += tf.LineHeight() + int(c.U*3)
			continue
		}
		for _, e := range todays {
			if y+tf.LineHeight() > bottom {
				break
			}
			when := T(lang, "All day", "Cả ngày", "全天")
			if !e.AllDay {
				when = e.Start.In(loc).Format("15:04")
			}
			past := !e.AllDay && e.End.Before(now)
			grey := uint8(0)
			if past {
				grey = 150
			}
			c.Text(bf, m, y, when, grey)
			x := m + int(c.U*18)
			c.Text(tf, x, y, c.Ellipsize(tf, e.Title, c.W-m-x), grey)
			y += tf.LineHeight() + int(c.U*1.2)
		}
		y += int(c.U * 2.5)
	}

	if len(tasks) > 0 {
		ty := c.H - int(c.U*10) - min(len(tasks), 6)*int(c.U*6) - int(c.U*6)
		c.HLine(m, ty, c.W-2*m, max(1, int(c.U*0.3)), 0)
		ty += int(c.U * 2)
		c.Text(sf, m, ty, strings.ToUpper(T(lang, "To do", "Việc cần làm", "待办")), 90)
		ty += sf.LineHeight() + int(c.U)
		box := int(c.U * 3.4)
		for _, t := range tasks[:min(len(tasks), 6)] {
			c.Box(m, ty+int(c.U*0.6), box, box, int(c.U*0.8), max(2, int(c.U*0.4)), 0, -1)
			c.Text(tf, m+box+int(c.U*2.5), ty, c.Ellipsize(tf, t, c.W-2*m-box-int(c.U*3)), 0)
			ty += int(c.U * 6)
		}
	}

	status := T(lang, "Updated ", "Cập nhật ", "更新于 ") + now.Format("15:04")
	if len(problems) > 0 {
		status += " · " + c.Ellipsize(c.F(2.6, false), problems[0], c.W/2)
	}
	footer(c, status)
	return time.Duration(max(cfg.Interval, 60)) * time.Second, nil
}

func fetchICS(u string, from, to time.Time, loc *time.Location) ([]event, error) {
	u = strings.Replace(u, "webcal://", "https://", 1)
	res, err := client.Get(u)
	if err != nil {
		return nil, fmt.Errorf("calendar: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("calendar: %s", res.Status)
	}
	body, _ := io.ReadAll(io.LimitReader(res.Body, 20<<20))
	p := gocal.NewParser(strings.NewReader(string(body)))
	p.Start, p.End = &from, &to
	p.Strict.Mode = gocal.StrictModeFailEvent // skip a broken event, keep the rest
	if err := p.Parse(); err != nil {
		return nil, fmt.Errorf("calendar: %v", err)
	}
	var out []event
	for _, e := range p.Events {
		if e.Start == nil || e.End == nil {
			continue
		}
		allDay := e.RawStart.Params["VALUE"] == "DATE"
		start, end := e.Start.In(loc), e.End.In(loc)
		if allDay { // all-day dates are floating: keep the calendar day
			start = time.Date(e.Start.Year(), e.Start.Month(), e.Start.Day(), 0, 0, 0, 0, loc)
			end = time.Date(e.End.Year(), e.End.Month(), e.End.Day(), 0, 0, 0, 0, loc)
			if !end.After(start) || e.End.Hour() != 0 { // gocal ends all-day events at 23:59:59
				end = end.AddDate(0, 0, 1)
			}
		}
		out = append(out, event{start, end, allDay, e.Summary})
	}
	return out, nil
}

// todoist returns today's and overdue task titles.
func todoist(token string) ([]string, error) {
	if token == "" {
		return nil, nil
	}
	req, _ := http.NewRequest("GET", "https://api.todoist.com/api/v1/tasks/filter?query=today%20%7C%20overdue", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("todoist: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("todoist: %s", res.Status)
	}
	var page struct {
		Results []struct {
			Content string `json:"content"`
		} `json:"results"`
	}
	if err := jsonDecode(res.Body, &page); err != nil {
		return nil, fmt.Errorf("todoist: %v", err)
	}
	var out []string
	for _, t := range page.Results {
		out = append(out, t.Content)
	}
	return out, nil
}

var (
	weekdaysVI = []string{"Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"}
	weekdaysZH = []string{"星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"}
)

func weekday(t time.Time, lang string) string {
	return T(lang, t.Weekday().String(), weekdaysVI[t.Weekday()], weekdaysZH[t.Weekday()])
}

func dayMonth(t time.Time, lang string) string {
	return T(lang, t.Format("January 2"), fmt.Sprintf("%d tháng %d", t.Day(), t.Month()), fmt.Sprintf("%d月%d日", t.Month(), t.Day()))
}

func relDay(d int, t time.Time, lang string) string {
	switch d {
	case 0:
		return T(lang, "Today", "Hôm nay", "今天")
	case 1:
		return T(lang, "Tomorrow", "Ngày mai", "明天")
	}
	return weekday(t, lang) + T(lang, t.Format(", Jan 2"), fmt.Sprintf(", %d/%d", t.Day(), t.Month()), fmt.Sprintf(" %d月%d日", t.Month(), t.Day()))
}
