// kindle.trinh.uk — static site + a few dynamic routes:
//   /r               KPM repository manifest (short so it's easy to type on a Kindle)
//   /d               demo e-ink dashboard (clock + weather for the viewer's location)
//   /api/jailbreaks  live copy of kindlemodding.org's jailbreak table, cached
//   /b/<id>          family message board: send a note/photo to someone's Kindle
//   /api/board/<id>  board storage (KV), polled by the kf-board app

const JB_URL = "https://kindlemodding.org/jailbreaks.json";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    switch (url.pathname) {
      case "/r":
        return env.ASSETS.fetch(new Request(new URL("/repo/manifest.v2.json", url), request));
      case "/d":
        return dashboard(request, url, ctx);
      case "/mirror.ps1": {
        // PowerShell's `irm | iex` needs a text type to read the script as a string.
        const res = await env.ASSETS.fetch(request);
        return new Response(res.body, { status: res.status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
      case "/api/jailbreaks":
        return jailbreaks(env, url, ctx);
      default:
        if (url.pathname.startsWith("/b/")) {
          return env.ASSETS.fetch(new Request(new URL("/board", url), request));
        }
        if (url.pathname.startsWith("/api/board/")) return board(request, env, url);
        return env.ASSETS.fetch(request);
    }
  },
};

async function cached(ctx, key, ttl, make) {
  const cache = caches.default;
  const req = new Request(key);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await make();
  if (res.ok) {
    const copy = new Response(res.clone().body, res);
    copy.headers.set("Cache-Control", `public, max-age=${ttl}`);
    ctx.waitUntil(cache.put(req, copy));
  }
  return res;
}

async function jailbreaks(env, url, ctx) {
  const res = await cached(ctx, "https://cache.kindle.trinh.uk/jailbreaks", 6 * 3600, async () => {
    try {
      const r = await fetch(JB_URL, { headers: { "User-Agent": "kindle.trinh.uk" } });
      const data = await r.json();
      if (!Array.isArray(data)) throw new Error("bad data");
      return Response.json(data);
    } catch {
      return new Response("upstream error", { status: 502 });
    }
  });
  if (res.ok) return res;
  return env.ASSETS.fetch(new Request(new URL("/data/jailbreaks.json", url)));
}

/* ---------- Dashboard ---------- */

const WMO = {
  en: [[0, "Clear"], [2, "Partly cloudy"], [3, "Cloudy"], [48, "Fog"], [57, "Drizzle"], [67, "Rain"], [77, "Snow"], [82, "Showers"], [86, "Snow showers"], [99, "Thunderstorm"]],
  zh: [[0, "晴"], [2, "多云间晴"], [3, "阴"], [48, "雾"], [57, "毛毛雨"], [67, "雨"], [77, "雪"], [82, "阵雨"], [86, "阵雪"], [99, "雷暴"]],
  vi: [[0, "Trời quang"], [2, "Ít mây"], [3, "Nhiều mây"], [48, "Sương mù"], [57, "Mưa phùn"], [67, "Mưa"], [77, "Tuyết"], [82, "Mưa rào"], [86, "Mưa tuyết"], [99, "Dông"]],
};
const DAYS = { zh: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], vi: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] };
const MONTHS = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  vi: ["tháng 1", "tháng 2", "tháng 3", "tháng 4", "tháng 5", "tháng 6", "tháng 7", "tháng 8", "tháng 9", "tháng 10", "tháng 11", "tháng 12"],
};
const LONG_DAYS = {
  zh: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  vi: ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"],
};

const wmo = (code, lang) => (WMO[lang].find(([max]) => code <= max) || WMO[lang][WMO[lang].length - 1])[1];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function dashboard(request, url, ctx) {
  const q = url.searchParams;
  const cf = request.cf || {};
  const auto = { VN: "vi", CN: "zh", TW: "zh", HK: "zh", MO: "zh" }[cf.country];
  const lang = WMO[q.get("lang")] ? q.get("lang") : auto || "en";
  const lat = parseFloat(q.get("lat") ?? cf.latitude ?? 21.03).toFixed(2);
  const lon = parseFloat(q.get("lon") ?? cf.longitude ?? 105.85).toFixed(2);
  const place = q.get("name") ?? cf.city ?? "";
  const unit = q.get("unit") === "f" ? "fahrenheit" : "celsius";

  let w = null;
  const api = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=4` +
    `&current=temperature_2m,weather_code,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=${unit}`;
  try {
    const res = await cached(ctx, "https://cache.kindle.trinh.uk/wx?" + api.split("?")[1], 900, () => fetch(api));
    if (res.ok) w = await res.json();
  } catch {}

  const offset = w?.utc_offset_seconds ?? (cf.timezone ? tzOffset(cf.timezone) : 0);
  const now = new Date(Date.now() + offset * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const time = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}`;
  const date = {
    vi: `${LONG_DAYS.vi[now.getUTCDay()]}, ${now.getUTCDate()} ${MONTHS.vi[now.getUTCMonth()]}`,
    zh: `${now.getUTCMonth() + 1}月${now.getUTCDate()}日 ${LONG_DAYS.zh[now.getUTCDay()]}`,
    en: `${LONG_DAYS.en[now.getUTCDay()]}, ${MONTHS.en[now.getUTCMonth()]} ${now.getUTCDate()}`,
  }[lang];

  let weather = "";
  if (w?.current) {
    const d = w.daily;
    const days = d.time.slice(1, 4).map((iso, i) => {
      const day = DAYS[lang][new Date(iso + "T00:00:00Z").getUTCDay()];
      return `<td><b>${day}</b><span>${Math.round(d.temperature_2m_max[i + 1])}° / ${Math.round(d.temperature_2m_min[i + 1])}°</span><small>${wmo(d.weather_code[i + 1], lang)}</small></td>`;
    }).join("");
    weather = `<div class="now"><div class="temp">${Math.round(w.current.temperature_2m)}°</div>
      <div class="cond"><b>${wmo(w.current.weather_code, lang)}</b>
      <span>H ${Math.round(d.temperature_2m_max[0])}° · L ${Math.round(d.temperature_2m_min[0])}° · ${w.current.relative_humidity_2m}%</span>
      <span>${esc(place)}</span></div></div>
      <table class="days"><tr>${days}</tr></table>`;
  }

  // ES5 only, no flexbox gaps: older Kindle browsers are WebKit from 2012.
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="900"><title>Dashboard</title>
<style>
html,body{margin:0;background:#fff;color:#000;font-family:Georgia,"Bookerly",serif;height:100%}
.wrap{padding:6vw 7vw;box-sizing:border-box;min-height:100%}
.time{font:bold 27vw/1 Helvetica,Arial,sans-serif;letter-spacing:-.04em;margin:0}
.date{font-size:5.6vw;margin:1vw 0 7vw}
.now{border-top:.6vw solid #000;padding-top:5vw;overflow:hidden}
.temp{float:left;font:bold 19vw/1 Helvetica,Arial,sans-serif;margin-right:5vw}
.cond b{display:block;font-size:6.4vw;margin:1.5vw 0 1vw}
.cond span{display:block;font-size:4.2vw;color:#333}
.days{width:100%;border-collapse:collapse;margin-top:7vw;border-top:.3vw solid #000}
.days td{width:33%;padding:3.5vw 0 0;vertical-align:top}
.days b{display:block;font:bold 4.6vw Helvetica,Arial,sans-serif}
.days span{display:block;font-size:5vw;margin:1vw 0}
.days small{font-size:3.6vw;color:#333}
.foot{margin-top:8vw;font:3vw Helvetica,Arial,sans-serif;color:#666}
</style></head><body><div class="wrap">
<p class="time" id="t">${time}</p><div class="date">${date}</div>
${weather}
<div class="foot">kindle.trinh.uk/d</div></div>
<script>
var off=${offset * 1000},base=${Date.now()},start=new Date().getTime();
function p(n){return n<10?"0"+n:""+n}
function tick(){var d=new Date(base+off+(new Date().getTime()-start));
document.getElementById("t").innerHTML=p(d.getUTCHours())+":"+p(d.getUTCMinutes());
setTimeout(tick,(60-d.getUTCSeconds())*1000)}
tick();
</script></body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function tzOffset(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(new Date());
    const m = parts.find((p) => p.type === "timeZoneName").value.match(/GMT([+-]\d+)(?::(\d+))?/);
    if (!m) return 0;
    const h = parseInt(m[1], 10);
    return (h * 60 + Math.sign(h || 1) * parseInt(m[2] || "0", 10)) * 60;
  } catch {
    return 0;
  }
}

/* ---------- Message board ---------- */

// KV layout: b:<id> → meta {w, h, name, seq, recent: [{seq, from, at}]}
//            b:<id>:<seq> → PNG, expires after 30 days
const BOARD_ID = /^[a-z2-9]{8,32}$/;
const MAX_PNG = 3 << 20;

async function board(request, env, url) {
  const [, , , id, action, file] = url.pathname.split("/");
  if (!BOARD_ID.test(id || "")) return new Response("bad board id", { status: 400 });
  const key = "b:" + id;
  const meta = (await env.BOARD.get(key, "json")) || { w: 1072, h: 1448, name: "Kindle", seq: 0, recent: [] };
  const q = url.searchParams;

  // The Kindle polls this; it also tells us its screen size and name.
  if (action === "latest" && request.method === "GET") {
    const w = +q.get("w"), h = +q.get("h"), name = (q.get("name") || "").slice(0, 60);
    if ((w && h && (w !== meta.w || h !== meta.h)) || (name && name !== meta.name) || !meta.seen) {
      Object.assign(meta, w && h ? { w: Math.min(w, 4000), h: Math.min(h, 4000) } : {}, name ? { name } : {}, { seen: true });
      await env.BOARD.put(key, JSON.stringify(meta));
    }
    return Response.json({ seq: meta.seq, url: meta.seq ? `/api/board/${id}/img/${meta.seq}.png` : "" });
  }
  if (action === "info" && request.method === "GET") {
    return Response.json({ w: meta.w, h: meta.h, name: meta.name, seen: !!meta.seen, recent: meta.recent });
  }
  if (action === "img" && request.method === "GET") {
    const png = await env.BOARD.get(`${key}:${parseInt(file, 10)}`, "arrayBuffer");
    if (!png) return new Response("not found", { status: 404 });
    return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
  }
  if (!action && request.method === "POST") {
    const body = await request.arrayBuffer();
    const sig = new Uint8Array(body.slice(0, 4));
    if (body.byteLength > MAX_PNG || sig[0] !== 0x89 || sig[1] !== 0x50) return new Response("send a PNG under 3 MB", { status: 400 });
    if (meta.lastAt && Date.now() - meta.lastAt < 5000) return new Response("slow down", { status: 429 });
    let from = request.headers.get("X-From") || "";
    try { from = decodeURIComponent(from); } catch {}
    from = from.slice(0, 40);
    meta.seq += 1;
    meta.lastAt = Date.now();
    meta.recent = [{ seq: meta.seq, from, at: meta.lastAt }, ...meta.recent].slice(0, 10);
    await env.BOARD.put(`${key}:${meta.seq}`, body, { expirationTtl: 30 * 86400 });
    await env.BOARD.put(key, JSON.stringify(meta));
    return Response.json({ ok: true, seq: meta.seq });
  }
  return new Response("not found", { status: 404 });
}
