"use strict";

// Sends a note (and optionally a photo) to someone's Kindle message board.
// The note is drawn here at the Kindle's exact resolution, dithered for
// e-ink, and uploaded as a PNG; the Kindle just shows it.

const id = location.pathname.split("/")[2] || "";
const LANGS = [["en", "EN"], ["zh", "中文"], ["vi", "VI"]];
let lang = /^vi/i.test(navigator.language) ? "vi" : /^zh/i.test(navigator.language) ? "zh" : "en";
try { const v = localStorage.getItem("kf.lang"); if (LANGS.some(([k]) => k === v)) lang = v; } catch (e) {}
const tr = (en, vi, zh) => (lang === "vi" ? vi : lang === "zh" ? zh : en);
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let info = { w: 1072, h: 1448, name: "Kindle", recent: [] };
let photo = null;
let canvas = null;

function render() {
  document.documentElement.lang = lang;
  $("#lang").innerHTML = LANGS.map(([k, n]) => `<button data-lang="${k}" class="${k === lang ? "on" : ""}">${n}</button>`).join("");
  const text = $("#msg")?.value ?? "";
  const from = $("#from")?.value ?? (localStorage.getItem("kf.from") || "");
  $("#app").innerHTML = `<section class="screen">
    <p class="who">${tr("Message board", "Bảng tin", "留言板")}</p>
    <h1>${esc(info.name)}</h1>
    <p class="lead">${tr("Write something. It appears on the Kindle within a minute.", "Viết gì đó. Nó sẽ hiện trên Kindle trong vòng một phút.", "写点什么，一分钟内就会出现在 Kindle 上。")}</p>
    <div class="compose">
      <textarea id="msg" rows="4" maxlength="400" placeholder="${tr("Dinner's in the fridge ❤️", "Cơm để trong tủ lạnh nhé ❤️", "饭在冰箱里 ❤️")}">${esc(text)}</textarea>
      <div class="row2">
        <input type="text" id="from" maxlength="40" placeholder="${tr("From", "Từ", "来自")}" value="${esc(from)}">
        <label class="photo ${photo ? "has" : ""}"><input type="file" accept="image/*" id="pic">${photo ? tr("Change photo", "Đổi ảnh", "更换照片") : tr("Add photo", "Thêm ảnh", "添加照片")}</label>
      </div>
    </div>
    <div class="preview"><div class="device" id="dev"></div></div>
    <button class="btn primary send" id="send">${tr("Send to Kindle", "Gửi lên Kindle", "发送到 Kindle")}</button>
    ${info.recent.length ? `<div class="recent"><h3>${tr("Recent", "Gần đây", "最近")}</h3>${info.recent.map((r) => `<div><span>${esc(r.from || "—")}</span><span>${new Date(r.at).toLocaleString(lang)}</span></div>`).join("")}</div>` : ""}
  </section>`;
  draw();
  $("#msg").addEventListener("input", draw);
  $("#from").addEventListener("input", draw);
  $("#pic").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    photo = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = URL.createObjectURL(f); });
    render();
  });
  $("#send").addEventListener("click", send);
}

// Lay out the note: optional photo on top, the message as large as fits,
// then who it's from and when.
function draw() {
  const W = info.w, H = info.h, M = Math.round(W * 0.08);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  let top = M;
  if (photo) {
    const ph = Math.round(H * 0.5);
    const s = Math.max(W / photo.width, ph / photo.height);
    g.save(); g.beginPath(); g.rect(0, 0, W, ph); g.clip();
    g.drawImage(photo, (W - photo.width * s) / 2, (ph - photo.height * s) / 2, photo.width * s, photo.height * s);
    g.restore();
    top = ph + M * 0.8;
  }
  const text = ($("#msg")?.value || "").trim() || (photo ? "" : tr("Hello!", "Xin chào!", "你好！"));
  const from = ($("#from")?.value || "").trim();
  const bottom = H - M - (from ? W * 0.09 : 0);
  // Biggest font size whose wrapped text fits the space.
  let size = Math.round(W * 0.16), lines = [];
  const family = '"Inter", "PingFang SC", "Noto Sans", Helvetica, Arial, sans-serif';
  for (; size > W * 0.035; size -= 2) {
    g.font = `700 ${size}px ${family}`;
    lines = wrap(g, text, W - 2 * M);
    if (lines.length * size * 1.22 <= bottom - top) break;
  }
  g.fillStyle = "#000";
  g.textBaseline = "top";
  const blockH = lines.length * size * 1.22;
  let y = photo ? top : top + Math.max(0, (bottom - top - blockH) / 2);
  for (const l of lines) { g.fillText(l, M, y); y += size * 1.22; }
  if (from) {
    g.font = `500 ${Math.round(W * 0.045)}px ${family}`;
    g.fillStyle = "#555";
    const when = new Date().toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
    g.fillText(`— ${from} · ${when}`, M, H - M - W * 0.06);
  }
  if (photo) dither(c);
  canvas = c;
  $("#dev").replaceChildren(c);
}

function wrap(g, text, maxW) {
  const out = [];
  for (const para of text.split("\n")) {
    // Split words, but let CJK break anywhere.
    const tokens = para.match(/[぀-ヿ㐀-鿿豈-﫿]|[^\s぀-ヿ㐀-鿿豈-﫿]+|\s+/g) || [""];
    let line = "";
    for (const t of tokens) {
      const test = line + t;
      if (line.trim() && g.measureText(test.trimEnd()).width > maxW) { out.push(line.trimEnd()); line = t.trimStart(); }
      else line = test;
    }
    out.push(line.trimEnd());
  }
  return out;
}

// Floyd–Steinberg to 16 greys, so photos look right on e-ink.
function dither(c) {
  const g = c.getContext("2d");
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data, w = c.width, h = c.height;
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = p[i * 4] * 0.299 + p[i * 4 + 1] * 0.587 + p[i * 4 + 2] * 0.114;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, v = Math.max(0, Math.min(255, Math.round(L[i] / 17) * 17)), e = L[i] - v;
    L[i] = v;
    if (x + 1 < w) L[i + 1] += e * 7 / 16;
    if (y + 1 < h) { if (x) L[i + w - 1] += e * 3 / 16; L[i + w] += e * 5 / 16; if (x + 1 < w) L[i + w + 1] += e / 16; }
  }
  for (let i = 0; i < w * h; i++) p[i * 4] = p[i * 4 + 1] = p[i * 4 + 2] = L[i];
  g.putImageData(d, 0, 0);
}

async function send() {
  const btn = $("#send");
  btn.disabled = true;
  const from = $("#from").value.trim();
  try { localStorage.setItem("kf.from", from); } catch (e) {}
  const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
  const res = await fetch(`/api/board/${id}`, { method: "POST", body: blob, headers: { "X-From": encodeURIComponent(from) } });
  if (!res.ok) {
    btn.disabled = false;
    btn.textContent = (await res.text()) || "Error";
    return;
  }
  $("#app").innerHTML = `<section class="ok"><div class="tick">✓</div><h2>${tr("Sent!", "Đã gửi!", "已发送！")}</h2>
    <p class="lead" style="margin:8px auto 30px">${tr("It shows up on the Kindle within a minute.", "Sẽ hiện trên Kindle trong vòng một phút.", "一分钟内会出现在 Kindle 上。")}</p>
    <button class="btn" id="again">${tr("Send another", "Gửi tiếp", "再发一条")}</button></section>`;
  $("#again").addEventListener("click", () => { photo = null; load(); });
}

$("#lang").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lang]");
  if (!b) return;
  lang = b.dataset.lang;
  try { localStorage.setItem("kf.lang", lang); } catch (err) {}
  render();
});

async function load() {
  if (!/^[a-z2-9]{8,32}$/.test(id)) {
    $("#app").innerHTML = `<section class="screen"><h1>${tr("Board not found", "Không tìm thấy bảng tin", "找不到留言板")}</h1></section>`;
    return;
  }
  try { info = await (await fetch(`/api/board/${id}/info`)).json(); } catch (e) {}
  render();
}
load();
