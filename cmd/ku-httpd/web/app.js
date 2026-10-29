"use strict";

const LANGS = [["en", "EN"], ["zh", "中文"], ["vi", "VI"]];
let lang = /^vi/i.test(navigator.language || "") ? "vi" : /^zh/i.test(navigator.language || "") ? "zh" : "en";
try { const v = localStorage.getItem("ku.lang"); if (LANGS.some(([k]) => k === v)) lang = v; } catch (e) {}
const VI = lang === "vi";
const tr = (en, vi, zh) => (lang === "vi" ? vi : lang === "zh" ? zh : en);
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let status = { width: 1072, height: 1448 };
let tab = "display";
let hold = true; // pause the Kindle UI so shown images stay put

/* ---------- API ---------- */

async function api(path, opts = {}) {
  const init = { method: opts.method || (opts.body !== undefined ? "POST" : "GET"), headers: {} };
  if (opts.body instanceof Blob || opts.body instanceof FormData) init.body = opts.body;
  else if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body);
    init.headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, init);
  if (res.status === 401) { showPair(); throw new Error(tr("Not paired", "Chưa ghép đôi", "未配对")); }
  if (!res.ok) throw new Error((await res.text()).trim() || res.statusText);
  const type = res.headers.get("Content-Type") || "";
  return type.includes("json") ? res.json() : res;
}

function toast(msg, bad) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast show" + (bad ? " bad" : "");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = "toast"), 2200);
}

async function act(fn, okMsg) {
  try {
    await fn();
    if (okMsg) toast(okMsg);
  } catch (e) {
    toast(e.message, true);
  }
}

/* ---------- Pairing ---------- */

function showPair() {
  $("#main").hidden = true;
  $("#pair").hidden = false;
  $("#pin").focus();
}

$("#pin").addEventListener("input", async (e) => {
  const v = e.target.value.replace(/\D/g, "");
  e.target.value = v;
  $("#pin-err").textContent = "";
  if (v.length !== 6) return;
  try {
    await api("/api/pair", { body: { pin: v } });
    start();
  } catch (err) {
    e.target.value = "";
    $("#pin-err").textContent = tr("Wrong PIN. Check the Kindle screen.", "Sai PIN. Xem lại màn hình Kindle.", "PIN 错误，请查看 Kindle 屏幕。");
  }
});

/* ---------- Header ---------- */

async function refreshStatus() {
  try {
    status = await api("/api/status");
  } catch (e) {
    if (e instanceof TypeError) $("#stat").textContent = tr("Offline · retrying…", "Mất kết nối · đang thử lại…", "离线 · 正在重试…");
    return;
  }
  const parts = [`${status.battery}%${status.charging ? " ⚡︎" : ""}`];
  if (status.ip) parts.push(status.ip);
  if (status.frame) parts.push(tr("Photo frame", "Khung ảnh", "相框"));
  $("#stat").textContent = parts.join(" · ");
  if (tab === "device" || tab === "frame") renderTab(true);
}

async function refreshShot() {
  const btn = $("#refresh");
  btn.classList.add("spin");
  const img = $("#shot");
  img.onload = () => { btn.classList.remove("spin"); img.style.visibility = "visible"; };
  img.onerror = () => { btn.classList.remove("spin"); img.style.visibility = "hidden"; };
  img.src = "/api/screen.png?t=" + Date.now();
}

$("#refresh").addEventListener("click", () => { refreshStatus(); refreshShot(); });
$("#thumb").addEventListener("click", () => {
  openSheet(tr("Kindle screen", "Màn hình Kindle", "Kindle 屏幕"), `<div class="preview"><img src="/api/screen.png?t=${Date.now()}" style="max-width:100%;max-height:70vh;border-radius:6px"></div>`);
});

/* ---------- Image pipeline: fit, rotate, greyscale, dither ---------- */

function kindleCanvas() {
  const c = document.createElement("canvas");
  c.width = status.width;
  c.height = status.height;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// Draw src onto a screen-sized canvas. Landscape sources are turned sideways
// on portrait panels so they use the whole screen.
function fitInto(src, mode = "contain", rotate = "auto") {
  const c = kindleCanvas();
  const g = c.getContext("2d");
  const sw = src.width || src.naturalWidth, sh = src.height || src.naturalHeight;
  const turn = rotate === "on" || (rotate === "auto" && (sw > sh) !== (c.width > c.height));
  const W = turn ? c.height : c.width, H = turn ? c.width : c.height;
  const s = mode === "cover" ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);
  g.save();
  g.translate(c.width / 2, c.height / 2);
  if (turn) g.rotate(Math.PI / 2);
  g.imageSmoothingQuality = "high";
  g.drawImage(src, (-sw * s) / 2, (-sh * s) / 2, sw * s, sh * s);
  g.restore();
  return c;
}

// Floyd–Steinberg to 16 grey levels — what e-ink panels can actually show.
function dither(c) {
  const g = c.getContext("2d");
  const d = g.getImageData(0, 0, c.width, c.height);
  const p = d.data, w = c.width, h = c.height;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = p[i * 4] * 0.299 + p[i * 4 + 1] * 0.587 + p[i * 4 + 2] * 0.114;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = lum[i];
      const v = Math.max(0, Math.min(255, Math.round(old / 17) * 17));
      const err = old - v;
      lum[i] = v;
      if (x + 1 < w) lum[i + 1] += (err * 7) / 16;
      if (y + 1 < h) {
        if (x > 0) lum[i + w - 1] += (err * 3) / 16;
        lum[i + w] += (err * 5) / 16;
        if (x + 1 < w) lum[i + w + 1] += err / 16;
      }
    }
  }
  for (let i = 0; i < w * h; i++) p[i * 4] = p[i * 4 + 1] = p[i * 4 + 2] = lum[i];
  g.putImageData(d, 0, 0);
  return c;
}

const toPNG = (c) => new Promise((r) => c.toBlob(r, "image/png"));

async function sendToKindle(canvas) {
  await act(async () => {
    await api("/api/show" + (hold ? "?hold=1" : ""), { body: await toPNG(canvas) });
    setTimeout(refreshShot, 2500);
  }, tr("On your Kindle ✓", "Đã hiện trên Kindle ✓", "已显示在 Kindle ✓"));
}

function loadImage(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error(tr("Can't read that image", "Không đọc được ảnh", "无法读取该图片")));
    img.src = URL.createObjectURL(file);
  });
}

/* ---------- Sheet ---------- */

function openSheet(title, html) {
  $("#sheet-card").innerHTML = `<div class="grab"></div><div class="sheet-head"><h3>${title}</h3>
    <button class="round" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>${html}`;
  $("#sheet").hidden = false;
  return $("#sheet-card");
}
const closeSheet = () => ($("#sheet").hidden = true);
$("#sheet").addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeSheet(); });

const holdOpt = () => `<label class="opt">${tr("Keep it on screen (pause Kindle UI)", "Giữ trên màn hình (tạm dừng giao diện Kindle)", "保持显示（暂停 Kindle 界面）")}
  <input type="checkbox" class="switch" id="hold" ${hold ? "checked" : ""}></label>`;
function wireHold(card) {
  const h = $("#hold", card);
  if (h) h.addEventListener("change", () => (hold = h.checked));
}

/* ---------- Display tools ---------- */

const ICON = {
  photo: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/></svg>',
  pdf: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  draw: '<svg viewBox="0 0 24 24"><path d="M3 21c3 0 4-1 5-3l9.5-9.5a2.1 2.1 0 0 0-3-3L5 15c-2 1-3 2-3 5"/></svg>',
  web: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
};

const TOOLS = [
  ["photo", tr("Photo", "Ảnh", "照片"), tr("Any picture", "Ảnh bất kỳ", "任意图片"), "linear-gradient(135deg,#0a84ff,#0040a0)", photoTool],
  ["pdf", "PDF", tr("Show a page", "Hiện một trang", "显示一页"), "linear-gradient(135deg,#ff453a,#8a1010)", pdfTool],
  ["note", tr("Note", "Ghi chú", "笔记"), "Text / Markdown", "linear-gradient(135deg,#ffd60a,#a07000)", noteTool],
  ["draw", tr("Draw", "Vẽ", "手绘"), tr("Sketch live", "Vẽ tay", "随手画"), "linear-gradient(135deg,#30d158,#0b5d2a)", drawTool],
  ["web", tr("Web page", "Trang web", "网页"), tr("Open a URL", "Mở một URL", "打开网址"), "linear-gradient(135deg,#5e5ce6,#26246e)", webTool],
  ["clock", tr("Clock", "Đồng hồ", "时钟"), tr("Time + weather", "Giờ + thời tiết", "时间 + 天气"), "linear-gradient(135deg,#3a3a3c,#111)", () => openURL("https://kindle.trinh.uk/d" + (lang !== "en" ? "?lang=" + lang : ""))],
];

function photoTool() {
  const card = openSheet(tr("Photo", "Ảnh", "照片"), `
    <label class="pick" id="pick"><input type="file" accept="image/*" id="file"><b>${tr("Choose a photo", "Chọn ảnh", "选择照片")}</b>${tr("It's resized and dithered for e-ink", "Tự thu nhỏ và xử lý cho e-ink", "自动缩放并为墨水屏优化")}</label>
    <div class="preview" id="pv" hidden></div>
    <div class="seg" id="mode"><button data-v="contain" class="on">${tr("Fit", "Vừa khung", "适应")}</button><button data-v="cover">${tr("Fill", "Lấp đầy", "填满")}</button></div>
    ${holdOpt()}
    <div class="btns one"><button class="btn primary" id="send" disabled>${tr("Show on Kindle", "Hiện lên Kindle", "显示到 Kindle")}</button></div>`);
  wireHold(card);
  let img = null, mode = "contain", out = null;
  const draw = () => {
    if (!img) return;
    out = dither(fitInto(img, mode));
    const pv = $("#pv", card);
    pv.hidden = false;
    pv.replaceChildren(out);
    $("#pick", card).hidden = true;
    $("#send", card).disabled = false;
  };
  $("#file", card).addEventListener("change", async (e) => { img = await loadImage(e.target.files[0]); draw(); });
  seg($("#mode", card), (v) => { mode = v; draw(); });
  $("#send", card).addEventListener("click", () => sendToKindle(out));
}

function seg(el, onPick) {
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    el.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    onPick(b.dataset.v);
  });
}

let pdfjs = null;
async function loadPDFJS() {
  if (pdfjs) return pdfjs;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = res;
    s.onerror = () => rej(new Error(tr("Needs internet to open PDFs", "Cần internet để mở PDF", "打开 PDF 需要联网")));
    document.head.appendChild(s);
  });
  pdfjs = window.pdfjsLib;
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return pdfjs;
}

function pdfTool() {
  const card = openSheet("PDF", `
    <label class="pick" id="pick"><input type="file" accept="application/pdf" id="file"><b>${tr("Choose a PDF", "Chọn file PDF", "选择 PDF")}</b>${tr("Pick the page to show", "Chọn trang để hiện", "选择要显示的页面")}</label>
    <div class="preview" id="pv" hidden></div>
    <div class="pager" id="pager" hidden><button class="round" id="prev">‹</button><span id="pg"></span><button class="round" id="nextp">›</button></div>
    ${holdOpt()}
    <div class="btns one"><button class="btn primary" id="send" disabled>${tr("Show on Kindle", "Hiện lên Kindle", "显示到 Kindle")}</button></div>`);
  wireHold(card);
  let doc = null, n = 1, out = null;
  const render = async () => {
    const page = await doc.getPage(n);
    const v1 = page.getViewport({ scale: 1 });
    const scale = Math.min(status.width / v1.width, status.height / v1.height) * 1.5;
    const vp = page.getViewport({ scale });
    const c = document.createElement("canvas");
    c.width = vp.width;
    c.height = vp.height;
    const g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: g, viewport: vp }).promise;
    out = dither(fitInto(c, "contain", "off"));
    $("#pv", card).hidden = false;
    $("#pv", card).replaceChildren(out);
    $("#pg", card).textContent = `${n} / ${doc.numPages}`;
    $("#send", card).disabled = false;
  };
  $("#file", card).addEventListener("change", (e) => act(async () => {
    const lib = await loadPDFJS();
    doc = await lib.getDocument({ data: await e.target.files[0].arrayBuffer() }).promise;
    n = 1;
    $("#pick", card).hidden = true;
    $("#pager", card).hidden = false;
    await render();
  }));
  $("#prev", card).addEventListener("click", () => { if (n > 1) { n--; render(); } });
  $("#nextp", card).addEventListener("click", () => { if (doc && n < doc.numPages) { n++; render(); } });
  $("#send", card).addEventListener("click", () => sendToKindle(out));
}

// A tiny Markdown layout engine: headings, bullets, quotes, paragraphs.
function renderNote(text, size) {
  const c = kindleCanvas();
  const g = c.getContext("2d");
  const W = c.width, M = Math.round(W * 0.08);
  const base = Math.round(W * { s: 0.034, m: 0.045, l: 0.065 }[size]);
  let y = M;
  g.fillStyle = "#000";
  g.textBaseline = "top";
  const wrap = (str, font, lh, indent = 0, prefix = "") => {
    g.font = font;
    const words = str.split(/\s+/).filter(Boolean);
    let line = prefix;
    const flush = () => { g.fillText(line, M + indent, y); y += lh; line = ""; };
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (g.measureText(test).width > W - 2 * M - indent && line) { flush(); line = w; }
      else line = test;
    }
    if (line) flush();
  };
  for (const raw of text.replace(/\*\*|__|`/g, "").split("\n")) {
    const l = raw.trimEnd();
    if (!l.trim()) { y += base * 0.7; continue; }
    let m;
    if ((m = l.match(/^(#{1,3})\s+(.*)/))) {
      const k = [2.1, 1.6, 1.25][m[1].length - 1];
      y += base * 0.3;
      wrap(m[2], `800 ${base * k}px Helvetica, Arial, sans-serif`, base * k * 1.2);
      y += base * 0.35;
    } else if ((m = l.match(/^\s*[-*+]\s+(.*)/)) || (m = l.match(/^\s*\d+[.)]\s+(.*)/))) {
      g.font = `${base}px Georgia, serif`;
      g.fillText("•", M, y);
      wrap(m[1], `${base}px Georgia, serif`, base * 1.4, base * 1.1);
    } else if ((m = l.match(/^>\s?(.*)/))) {
      const top = y;
      wrap(m[1], `italic ${base}px Georgia, serif`, base * 1.4, base * 1.1);
      g.fillRect(M, top, Math.max(3, base * 0.15), y - top - base * 0.3);
    } else {
      wrap(l, `${base}px Georgia, serif`, base * 1.4);
    }
  }
  return c;
}

function noteTool() {
  const saved = localStorage.getItem("ku.note") || tr("# Hello\n\nWrite **anything** here.\n\n- Shopping list\n- Quotes\n- Messages for home", "# Xin chào\n\nViết gì cũng được.\n\n- Danh sách đi chợ\n- Trích dẫn\n- Lời nhắn cho cả nhà", "# 你好\n\n随便写点什么。\n\n- 购物清单\n- 名言\n- 给家人的留言");
  const card = openSheet(tr("Note", "Ghi chú", "笔记"), `
    <textarea class="input" id="txt">${esc(saved)}</textarea>
    <div class="seg" id="size" style="margin:12px 0"><button data-v="s">${tr("Small", "Nhỏ", "小")}</button><button data-v="m" class="on">${tr("Medium", "Vừa", "中")}</button><button data-v="l">${tr("Large", "Lớn", "大")}</button></div>
    <div class="preview" id="pv"></div>
    ${holdOpt()}
    <div class="btns one"><button class="btn primary" id="send">${tr("Show on Kindle", "Hiện lên Kindle", "显示到 Kindle")}</button></div>`);
  wireHold(card);
  let size = "m", out;
  const draw = () => {
    localStorage.setItem("ku.note", $("#txt", card).value);
    out = renderNote($("#txt", card).value, size);
    $("#pv", card).replaceChildren(out);
  };
  $("#txt", card).addEventListener("input", draw);
  seg($("#size", card), (v) => { size = v; draw(); });
  draw();
  $("#send", card).addEventListener("click", () => sendToKindle(out));
}

function drawTool() {
  const card = openSheet(tr("Draw", "Vẽ", "手绘"), `
    <div class="tools"><div class="seg" id="pen" style="flex:2"><button data-v="4">${tr("Fine", "Mảnh", "细")}</button><button data-v="10" class="on">${tr("Pen", "Bút", "笔")}</button><button data-v="26">${tr("Marker", "Dạ", "马克笔")}</button><button data-v="erase">${tr("Eraser", "Tẩy", "橡皮")}</button></div>
    <button class="btn" id="clr" style="padding:9px">${tr("Clear", "Xoá", "清除")}</button></div>
    <div class="preview" id="pv"></div>
    ${holdOpt()}
    <div class="btns one"><button class="btn primary" id="send">${tr("Show on Kindle", "Hiện lên Kindle", "显示到 Kindle")}</button></div>`);
  wireHold(card);
  const c = kindleCanvas();
  $("#pv", card).appendChild(c);
  const g = c.getContext("2d");
  g.lineCap = g.lineJoin = "round";
  let width = 10, erase = false, last = null;
  seg($("#pen", card), (v) => { erase = v === "erase"; width = erase ? 60 : +v; });
  const pos = (e) => {
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height];
  };
  c.addEventListener("pointerdown", (e) => { c.setPointerCapture(e.pointerId); last = pos(e); });
  c.addEventListener("pointermove", (e) => {
    if (!last) return;
    const p = pos(e);
    g.strokeStyle = erase ? "#fff" : "#000";
    g.lineWidth = width * (e.pressure && e.pointerType === "pen" ? 0.5 + e.pressure : 1);
    g.beginPath();
    g.moveTo(...last);
    g.lineTo(...p);
    g.stroke();
    last = p;
  });
  c.addEventListener("pointerup", () => (last = null));
  $("#clr", card).addEventListener("click", () => { g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); });
  $("#send", card).addEventListener("click", () => sendToKindle(c));
}

function webTool() {
  const card = openSheet(tr("Web page", "Trang web", "网页"), `
    <input class="input" id="url" type="url" inputmode="url" placeholder="https://" value="${esc(localStorage.getItem("ku.url") || "")}">
    <p class="hint">${tr("Opens in the Kindle's browser.", "Mở bằng trình duyệt của Kindle.", "用 Kindle 浏览器打开。")}</p>
    <div class="btns one"><button class="btn primary" id="go">${tr("Open on Kindle", "Mở trên Kindle", "在 Kindle 打开")}</button></div>`);
  $("#go", card).addEventListener("click", () => {
    let u = $("#url", card).value.trim();
    if (u && !/^https?:\/\//.test(u)) u = "https://" + u;
    localStorage.setItem("ku.url", u);
    openURL(u);
  });
}

function openURL(url) {
  act(async () => {
    await api("/api/url", { body: { url } });
    closeSheet();
    setTimeout(refreshShot, 6000);
  }, tr("Opening on Kindle…", "Đang mở trên Kindle…", "正在 Kindle 上打开…"));
}

/* ---------- Tabs ---------- */

const tabs = {
  display() {
    return `<h2>${tr("Display", "Màn hình", "显示")}</h2><p class="sub">${tr("Put anything on the e-ink screen.", "Đưa mọi thứ lên màn hình e-ink.", "把任何内容放到墨水屏上。")}</p>
      <div class="grid">${TOOLS.map(([k, n, s, g]) => `<button class="tile" style="--g:${g}" data-tool="${k}">${ICON[k]}<div><b>${n}</b><span>${s}</span></div></button>`).join("")}</div>
      <p class="section">${tr("Screen", "Màn hình", "屏幕")}</p>
      <div class="btns"><button class="btn" data-do="home">${tr("Back to Kindle", "Về Kindle", "返回 Kindle")}</button><button class="btn" data-do="clear">${tr("Clear screen", "Xoá màn hình", "清屏")}</button></div>`;
  },

  frame() {
    const s = status;
    return `<h2>${tr("Photo frame", "Khung ảnh", "相框")}</h2><p class="sub">${tr("Your photos, one after another.", "Ảnh của bạn, lần lượt từng tấm.", "你的照片，一张接一张。")}</p>
      <div class="card">
        <div class="row"><div class="grow">${tr("Photos", "Số ảnh", "照片数")}</div><span class="val">${s.frameCount ?? 0}</span></div>
        <div class="row"><div class="grow">${tr("Running", "Đang chạy", "运行中")}</div><input type="checkbox" class="switch" id="fon" ${s.frame ? "checked" : ""}></div>
      </div>
      <p class="section">${tr("Change every", "Đổi ảnh mỗi", "切换间隔")}</p>
      <div class="seg" id="every">${[1, 5, 15, 60, 240].map((m) => `<button data-v="${m}" class="${(+localStorage.getItem("ku.every") || 15) === m ? "on" : ""}">${m < 60 ? m + "m" : m / 60 + "h"}</button>`).join("")}</div>
      <div class="btns">
        <label class="btn primary"><input type="file" accept="image/*" multiple id="fadd" hidden>${tr("Add photos", "Thêm ảnh", "添加照片")}</label>
        <button class="btn danger" data-do="fclear">${tr("Remove all", "Xoá hết", "全部删除")}</button>
      </div>
      <p class="hint">${tr("Photos are cropped to fill the screen.", "Ảnh được cắt cho đầy màn hình.", "照片会裁剪以填满屏幕。")}</p>`;
  },

  files() {
    const site = filesView === "site";
    return `<h2>${tr("Files", "Tệp", "文件")}</h2>
      <div class="seg" id="fview" style="margin:10px 0 18px"><button data-v="books" class="${site ? "" : "on"}">${tr("Books", "Sách", "电子书")}</button><button data-v="site" class="${site ? "on" : ""}">Website</button></div>
      ${site ? `<p class="sub">${tr("Hosted at", "Đang chạy tại", "托管于")} <a href="/www/" target="_blank" style="color:var(--text)">${esc(location.host)}/www/</a></p>
        <input class="input" id="sdir" placeholder="${tr("Folder (optional), e.g. blog", "Thư mục (tuỳ chọn), vd: blog", "文件夹（可选），如 blog")}" style="margin-bottom:12px">
        <label class="pick"><input type="file" multiple id="sup"><b>${tr("Upload files", "Tải file lên", "上传文件")}</b><span id="sprog">${tr("A .zip is unpacked into a whole site", "File .zip sẽ được giải nén thành cả website", ".zip 会解压成整个网站")}</span></label>
        <div class="card" id="slist"><div class="empty">…</div></div>`
      : `<p class="sub">EPUB, PDF, MOBI, AZW3, TXT…</p>
        <label class="pick"><input type="file" multiple id="bup"><b>${tr("Send books", "Gửi sách", "发送电子书")}</b><span id="bprog">${tr("They appear in your Library", "Sách sẽ hiện trong Thư viện", "会出现在图书馆里")}</span></label>
        <div class="card" id="blist"><div class="empty">…</div></div>`}`;
  },

  apps() {
    return `<h2>${tr("Apps", "Ứng dụng", "应用")}</h2><p class="sub">${tr("Install apps on the Kindle from here. No typing on the Kindle.", "Cài app cho Kindle ngay tại đây, khỏi gõ trên Kindle.", "在这里为 Kindle 安装应用，无需在 Kindle 上输入。")}</p>
      <div class="card" id="applist"><div class="empty">…</div></div>
      <p class="hint">${tr("Open = same as tapping the app in the Kindle's Library.", "Mở = giống chạm vào app trong Library của Kindle.", "打开 = 相当于在 Kindle 图书馆里点该应用。")}</p>`;
  },

  device() {
    const s = status;
    return `<h2>${tr("Device", "Thiết bị", "设备")}</h2><p class="sub">${s.battery}% · ${s.charging ? tr("charging", "đang sạc", "充电中") : tr("on battery", "dùng pin", "使用电池")}</p>
      <div class="card">
        ${s.lightMax ? `<div class="row"><div class="grow">${tr("Front light", "Đèn nền", "阅读灯")}<input type="range" id="light" min="0" max="${s.lightMax}" value="${s.light}"></div></div>` : ""}
        <div class="row"><div class="grow">${tr("Stay awake", "Luôn thức", "保持唤醒")}<small>${tr("Keeps Wi-Fi on", "Giữ Wi-Fi luôn bật", "保持 Wi-Fi 连接")}</small></div><input type="checkbox" class="switch" id="awake" ${s.awake ? "checked" : ""}></div>
        <div class="row"><div class="grow">${tr("Pause Kindle UI", "Tạm dừng giao diện Kindle", "暂停 Kindle 界面")}<small>${tr("Images stay on screen", "Ảnh sẽ nằm yên trên màn hình", "图片会一直显示")}</small></div><input type="checkbox" class="switch" id="uip" ${s.uiPaused ? "checked" : ""}></div>
      </div>
      <div class="btns">
        <button class="btn" data-do="card">${tr("Show pairing QR", "Hiện mã QR", "显示配对二维码")}</button>
        <button class="btn" data-do="sleep">${tr("Sleep", "Ngủ", "休眠")}</button>
        <button class="btn danger" data-do="reboot">${tr("Restart", "Khởi động lại", "重启")}</button>
        <button class="btn" data-do="home">${tr("Home", "Màn hình chính", "主屏")}</button>
      </div>

      <p class="section">${tr("Language", "Ngôn ngữ", "语言")}</p>
      <div class="seg" id="langs">${LANGS.map(([k, n]) => `<button data-v="${k}" class="${k === lang ? "on" : ""}">${n}</button>`).join("")}</div>

      <p class="section">${tr("Notify me when it's online", "Báo khi Kindle online", "上线时通知我")}</p>
      <div class="card"><div class="row"><div class="grow"><input class="input" id="ntfy" placeholder="https://ntfy.sh/your-topic" value="${esc(settings.ntfy || "")}"></div></div></div>
      <div class="btns"><button class="btn" data-do="ntfygen">${tr("Make a topic", "Tạo topic", "生成 topic")}</button><button class="btn primary" data-do="ntfysave">${tr("Save + test", "Lưu + thử", "保存并测试")}</button></div>
      <p class="hint">${tr("Install the free <b>ntfy</b> app and subscribe to the same topic.", "Cài app <b>ntfy</b> (miễn phí) và theo dõi cùng topic.", "安装免费的 <b>ntfy</b> 应用并订阅同一个 topic。")}</p>

      <p class="section">${tr("Info", "Thông tin", "信息")}</p>
      <div class="card">
        <div class="row"><div class="grow">Wi-Fi</div><span class="val">${esc(s.ip || "—")}</span></div>
        <div class="row"><div class="grow">Tailscale</div><span class="val">${esc(s.tailnetIP || "—")}</span></div>
        <div class="row"><div class="grow">${tr("Screen", "Màn hình", "屏幕")}</div><span class="val">${s.width}×${s.height}</span></div>
        <div class="row"><div class="grow">${tr("Storage free", "Bộ nhớ trống", "可用空间")}</div><span class="val">${(s.freeGB || 0).toFixed(1)} / ${(s.totalGB || 0).toFixed(1)} GB</span></div>
        <div class="row"><div class="grow">${tr("Up for", "Đã chạy", "已运行")}</div><span class="val">${esc(s.uptime || "—")}</span></div>
      </div>

      <p class="section">${tr("Apps", "Ứng dụng", "应用")}</p>
      <div class="card" id="configs"><div class="empty">…</div></div>
      <p class="hint">${tr("Settings for your installed apps. Changes apply on their next refresh.", "Cài đặt cho các app đã cài. Thay đổi áp dụng ở lần làm mới kế tiếp.", "已安装应用的设置。下次刷新时生效。")}</p>

      <p class="section">${tr("Automation", "Tự động hoá", "自动化")}</p>
      <div class="card" id="scripts"><div class="empty">…</div></div>
      <p class="hint">${tr("Each .sh file in <code>unlocked/scripts</code> becomes a button.", "Mỗi file .sh trong <code>unlocked/scripts</code> thành một nút.", "<code>unlocked/scripts</code> 中的每个 .sh 文件都会变成一个按钮。")}</p>
      <div class="btns one"><button class="btn" id="showtoken">${tr("API token + examples", "API token + ví dụ", "API token + 示例")}</button></div>

      <p class="section">HTTP Server</p>
      <div class="card"><div class="row"><div class="grow">${tr("Remote web app", "Remote web app", "Remote 网页应用")}<small>${tr("Off = only serve unlocked/www", "Tắt = chỉ phục vụ unlocked/www", "关闭 = 只提供 unlocked/www")}</small></div><input type="checkbox" class="switch" id="remote" checked></div></div>
      <p class="hint">${tr("Add this page to your Home Screen for one-tap access. Your website lives at", "Thêm trang này ra màn hình chính để mở nhanh. Website của bạn ở", "把本页添加到主屏幕，一点即开。你的网站在")} <a href="/www/" style="color:var(--dim)">/www/</a></p>`;
  },
};

let settings = {};
let filesView = "books";

async function renderTab(soft) {
  const view = $("#view");
  if (soft) {
    // Only re-render tabs whose content depends on status; keep inputs stable.
    if (document.activeElement && view.contains(document.activeElement) && document.activeElement.matches("input[type=range], .input")) return;
  }
  if (tab === "device") settings = await api("/api/settings").catch(() => ({}));
  view.innerHTML = tabs[tab]();
  if (!soft) { view.style.animation = "none"; view.offsetHeight; view.style.animation = ""; }
  wireTab();
}

function wireTab() {
  const v = $("#view");
  v.querySelectorAll("[data-tool]").forEach((b) => b.addEventListener("click", () => TOOLS.find((t) => t[0] === b.dataset.tool)[4]()));
  v.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => DO[b.dataset.do]()));

  const light = $("#light", v);
  if (light) {
    let t;
    light.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => act(() => api("/api/light", { body: { value: +light.value } })), 150); });
  }
  const sw = (id, fn) => { const el = $(id, v); if (el) el.addEventListener("change", () => fn(el.checked, el)); };
  sw("#awake", (on) => act(() => api("/api/awake", { body: { on } })));
  sw("#uip", (on) => act(() => api("/api/hold", { body: { on } })));
  sw("#fon", (on) => act(async () => {
    await api("/api/frame", { body: { on, minutes: +localStorage.getItem("ku.every") || 15 } });
    refreshStatus();
  }, on ? tr("Photo frame on", "Đã bật khung ảnh", "相框已开启") : tr("Photo frame off", "Đã tắt khung ảnh", "相框已关闭")));
  sw("#remote", (on, el) => {
    if (on) return;
    if (!confirm(tr("Turn off the Remote web app? To turn it back on, tap “HTTP Server Settings” on the Kindle.", "Tắt Remote web app? Muốn bật lại, chạm “HTTP Server Settings” trên Kindle.", "关闭 Remote 网页应用？要重新开启，请在 Kindle 上点 “HTTP Server Settings”。"))) { el.checked = true; return; }
    act(() => api("/api/settings", { body: { ...settings, remote: false } }), tr("Remote is off", "Đã tắt Remote", "Remote 已关闭"));
  });

  const langs = $("#langs", v);
  if (langs) seg(langs, (k) => { try { localStorage.setItem("ku.lang", k); } catch (e) {} location.reload(); });
  const every = $("#every", v);
  if (every) seg(every, (m) => { localStorage.setItem("ku.every", m); if (status.frame) api("/api/frame", { body: { on: true, minutes: +m } }); });

  const fadd = $("#fadd", v);
  if (fadd) fadd.addEventListener("change", () => act(async () => {
    const files = [...fadd.files];
    for (let i = 0; i < files.length; i++) {
      toast(`${i + 1} / ${files.length}`);
      const c = dither(fitInto(await loadImage(files[i]), "cover"));
      await api("/api/frame/add", { body: await toPNG(c) });
    }
    refreshStatus();
  }, tr("Photos added", "Đã thêm ảnh", "照片已添加")));

  const bup = $("#bup", v);
  if (bup) {
    loadBooks();
    bup.addEventListener("change", () => upload("/api/books", bup.files, "#bprog", loadBooks));
  }
  const sup = $("#sup", v);
  if (sup) {
    loadSite();
    sup.addEventListener("change", () => upload("/api/site?dir=" + encodeURIComponent($("#sdir").value.trim()), sup.files, "#sprog", loadSite));
  }
  const fview = $("#fview", v);
  if (fview) seg(fview, (m) => { filesView = m; renderTab(); });
  if ($("#applist", v)) loadApps();
  if ($("#scripts", v)) loadScripts();
  if ($("#configs", v)) loadConfigs();
  const tok = $("#showtoken", v);
  if (tok) tok.addEventListener("click", showToken);
}

async function loadSite() {
  const list = $("#slist");
  if (!list) return;
  const files = await api("/api/site").catch(() => []);
  const size = (n) => (n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB");
  list.innerHTML = files.length ? files.map((f) => `<div class="row"><div class="grow"><div class="name">${f.dir ? "📁 " : ""}${esc(f.path)}</div>${f.dir ? "" : `<small>${size(f.size)}</small>`}</div>
    ${f.dir ? "" : `<a class="link" href="/www/${encodeURI(f.path)}" target="_blank" style="color:var(--blue);font-weight:600;padding:6px">${tr("Open", "Mở", "打开")}</a>`}
    <button class="link danger" data-del="${esc(f.path)}">${tr("Delete", "Xoá", "删除")}</button></div>`).join("")
    : `<div class="empty">${tr("Empty", "Trống", "空")}</div>`;
  list.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    if (!confirm(tr(`Delete “${b.dataset.del}”?`, `Xoá “${b.dataset.del}”?`, `删除 “${b.dataset.del}”？`))) return;
    act(async () => { await api("/api/site?path=" + encodeURIComponent(b.dataset.del), { method: "DELETE" }); loadSite(); });
  }));
}

async function loadScripts() {
  const box = $("#scripts");
  const list = await api("/api/scripts").catch(() => []);
  box.innerHTML = list.map((s) => `<div class="row"><div class="grow"><div class="name">${esc(s.name)}</div>${s.desc ? `<small>${esc(s.desc)}</small>` : ""}</div>
    <button class="link" data-run="${esc(s.name)}">${tr("Run", "Chạy", "运行")}</button></div>`).join("") || `<div class="empty">—</div>`;
  box.querySelectorAll("[data-run]").forEach((b) => b.addEventListener("click", async () => {
    const card = openSheet(esc(b.dataset.run), `<pre class="input" id="out" style="white-space:pre-wrap;min-height:120px;margin:0">${tr("Running…", "Đang chạy…", "运行中…")}</pre>`);
    try {
      const r = await api("/api/scripts/" + encodeURIComponent(b.dataset.run), { body: {} });
      $("#out", card).textContent = (r.output || "") + `\n[exit ${r.code}]`;
    } catch (e) {
      $("#out", card).textContent = e.message;
    }
  }));
}

const CATALOG_URL = "https://kindle.trinh.uk/r";
let catalog = null;

async function loadApps() {
  const box = $("#applist");
  if (!box) return;
  try {
    if (!catalog) catalog = (await (await fetch(CATALOG_URL)).json()).packages;
  } catch (e) {
    box.innerHTML = `<div class="empty">${tr("Can't reach kindle.trinh.uk. Is your phone online?", "Không tải được kindle.trinh.uk. Điện thoại có mạng không?", "无法访问 kindle.trinh.uk，手机联网了吗？")}</div>`;
    return;
  }
  const st = await api("/api/apps").catch(() => null);
  if (!st || !$("#applist")) return;
  const doing = { install: tr("Installing…", "Đang cài…", "安装中…"), uninstall: tr("Removing…", "Đang gỡ…", "卸载中…"), launch: tr("Opening…", "Đang mở…", "打开中…") };
  box.innerHTML = Object.entries(catalog).map(([id, p]) => {
    const has = st.installed.includes(id);
    let btns;
    if (st.busy === id) btns = `<span class="val">${doing[st.action]}</span>`;
    else if (!has) btns = `<button class="link" data-app="${esc(id)}" data-a="install" ${st.busy ? "disabled" : ""}>${tr("Install", "Cài", "安装")}</button>`;
    else btns = `<button class="link" data-app="${esc(id)}" data-a="launch" ${st.busy ? "disabled" : ""}>${tr("Open", "Mở", "打开")}</button>`
      + (id === st.self ? "" : `<button class="link danger" data-app="${esc(id)}" data-a="uninstall" ${st.busy ? "disabled" : ""}>${tr("Remove", "Gỡ", "卸载")}</button>`);
    return `<div class="row"><div class="grow"><div class="name">${esc(p.name || id)}${has ? " ✓" : ""}</div><small>${esc(p.description || "")}</small></div>${btns}</div>`;
  }).join("");
  box.querySelectorAll("[data-app]").forEach((b) => b.addEventListener("click", () => {
    const { app, a } = b.dataset;
    if (a === "uninstall" && !confirm(tr(`Remove ${catalog[app].name}?`, `Gỡ ${catalog[app].name}?`, `卸载 ${catalog[app].name}？`))) return;
    act(async () => { await api(`/api/apps/${encodeURIComponent(app)}?action=${a}`, { body: {} }); watchApps(); });
  }));
  return st;
}

// Poll while KPM works in the background, then report how it went.
async function watchApps() {
  clearTimeout(watchApps.t);
  const st = await loadApps();
  // A slow Kindle (unpacking a big download) can miss a poll: keep trying.
  if (!st) { if ($("#applist")) watchApps.t = setTimeout(watchApps, 4000); return; }
  if (st.busy) { watchApps.t = setTimeout(watchApps, 2000); return; }
  if (st.failed) openSheet(tr("Didn't work", "Không thành công", "未成功"), `<pre class="input" style="white-space:pre-wrap;margin:0;font-size:13px">${esc(st.log || "")}</pre>`);
  else if (st.action) toast(tr("Done ✓", "Xong ✓", "完成 ✓"));
}

const APP_NAMES = { board: "Message Board", ha: "Home Assistant", calendar: "Calendar", monitor: "Monitor", btc: "BTC Ticker", http: "HTTP Server", dash: "Dashboard", ssh: "SSH", tailscale: "Tailscale" };

async function loadConfigs() {
  const box = $("#configs");
  const list = await api("/api/configs").catch(() => []);
  box.innerHTML = list.map((a) => `<div class="row"><div class="grow"><div class="name">${esc(APP_NAMES[a] || a)}</div><small>unlocked/${esc(a)}/config.json</small></div>
    <button class="link" data-cfg="${esc(a)}">${tr("Edit", "Sửa", "编辑")}</button></div>`).join("") || `<div class="empty">—</div>`;
  box.querySelectorAll("[data-cfg]").forEach((b) => b.addEventListener("click", () => editConfig(b.dataset.cfg)));
}

async function editConfig(app, raw) {
  const res = await api("/api/config/" + encodeURIComponent(app)).catch((e) => ({ error: e.message }));
  if (app === "btc" && !raw && !res.error) return editBtc(res);
  const text = res.error ? "" : JSON.stringify(res, null, 2);
  const card = openSheet(esc(APP_NAMES[app] || app), `<textarea class="input" id="cfg" spellcheck="false" style="min-height:46vh;font-size:14px">${esc(text)}</textarea>
    <p class="err" id="cfgerr" style="color:var(--red);min-height:20px;margin:8px 4px 0"></p>
    <div class="btns one"><button class="btn primary" id="cfgsave">${tr("Save", "Lưu", "保存")}</button></div>`);
  $("#cfgsave", card).addEventListener("click", async () => {
    const raw = $("#cfg", card).value;
    try { JSON.parse(raw); } catch (e) { $("#cfgerr", card).textContent = e.message; return; }
    try {
      await api("/api/config/" + encodeURIComponent(app), { method: "PUT", body: JSON.parse(raw) });
      closeSheet();
      toast(tr("Saved ✓", "Đã lưu ✓", "已保存 ✓"));
    } catch (e) { $("#cfgerr", card).textContent = e.message; }
  });
}

// BTC Ticker gets a small form; everything else is plain JSON.
function editBtc(cfg) {
  const opt = (v, label, cur) => `<option value="${v}"${String(v) === String(cur) ? " selected" : ""}>${label}</option>`;
  const field = (label, html) => `<label style="display:block;margin:0 4px 14px"><small style="display:block;margin:0 0 6px 4px">${label}</small>${html}</label>`;
  const every = [[15, "15 s"], [30, "30 s"], [60, "1 min"], [120, "2 min"], [300, "5 min"], [900, "15 min"], [1800, "30 min"], [3600, "1 h"]];
  const cur = cfg.interval_seconds || 30;
  if (!every.some(([v]) => v === cur)) every.push([cur, cur + " s"]);
  const card = openSheet("BTC Ticker", `
    ${field(tr("Currency (ISO code, e.g. VND, EUR, JPY)", "Tiền tệ (mã ISO, vd: VND, EUR, JPY)", "货币（ISO 代码，如 VND、EUR、JPY）"),
      `<input class="input" id="cur" maxlength="3" autocapitalize="characters" autocomplete="off" value="${esc(cfg.currency || "")}" style="text-transform:uppercase">`)}
    ${field(tr("Update every", "Cập nhật mỗi", "更新频率"), `<select class="input" id="int">${every.map(([v, l]) => opt(v, l, cur)).join("")}</select>`)}
    ${field(tr("Screen", "Màn hình", "屏幕"), `<select class="input" id="land">${opt(1, tr("Landscape", "Ngang", "横屏"), cfg.landscape ? 1 : 0)}${opt(0, tr("Portrait", "Dọc", "竖屏"), cfg.landscape ? 1 : 0)}</select>`)}
    ${field(tr("Language", "Ngôn ngữ", "语言"), `<select class="input" id="lng">${opt("en", "English", cfg.lang)}${opt("vi", "Tiếng Việt", cfg.lang)}${opt("zh", "中文", cfg.lang)}</select>`)}
    <p class="err" id="cfgerr" style="color:var(--red);min-height:20px;margin:0 4px"></p>
    <div class="btns one"><button class="btn primary" id="cfgsave">${tr("Save", "Lưu", "保存")}</button></div>
    <p style="text-align:center;margin:12px 0 0"><button class="link" id="cfgraw">${tr("Edit as JSON", "Sửa dạng JSON", "以 JSON 编辑")}</button></p>`);
  $("#cfgraw", card).addEventListener("click", () => { closeSheet(); editConfig("btc", true); });
  $("#cfgsave", card).addEventListener("click", async () => {
    const code = $("#cur", card).value.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) { $("#cfgerr", card).textContent = tr("Use a 3-letter code like VND.", "Nhập mã 3 chữ cái, vd: VND.", "请输入 3 个字母的代码，如 VND。"); return; }
    const body = { ...cfg, currency: code, interval_seconds: +$("#int", card).value, landscape: $("#land", card).value === "1", lang: $("#lng", card).value };
    try {
      await api("/api/config/btc", { method: "PUT", body });
      closeSheet();
      toast(tr("Saved ✓", "Đã lưu ✓", "已保存 ✓"));
    } catch (e) { $("#cfgerr", card).textContent = e.message; }
  });
}

async function showToken() {
  const { token, url } = await api("/api/token");
  const base = url || location.origin;
  openSheet("API", `<p class="sub">${tr("Control the Kindle from scripts, Shortcuts or Home Assistant. Keep the token secret.", "Điều khiển Kindle từ script, Shortcuts hay Home Assistant. Giữ bí mật token.", "用脚本、快捷指令或 Home Assistant 控制 Kindle。请妥善保管 token。")}</p>
    <pre class="input" style="white-space:pre-wrap;word-break:break-all;font-size:13px;margin:0">${esc(`TOKEN=${token}

# show an image
curl -H "Authorization: Bearer $TOKEN" \\
  --data-binary @photo.png ${base}/api/show?hold=1

# open a web page
curl -H "Authorization: Bearer $TOKEN" \\
  -d '{"url":"https://example.com"}' ${base}/api/url

# status, screenshot, books
curl -H "Authorization: Bearer $TOKEN" ${base}/api/status
curl -H "Authorization: Bearer $TOKEN" -o screen.png ${base}/api/screen.png
curl -H "Authorization: Bearer $TOKEN" -F f=@book.epub ${base}/api/books

# mirror your computer screen (PC Mirror)
#   Mac:      curl -fsSL https://kindle.trinh.uk/mirror.sh | bash
#   Windows:  irm https://kindle.trinh.uk/mirror.ps1 | iex

# run unlocked/scripts/battery.sh
curl -X POST -H "Authorization: Bearer $TOKEN" ${base}/api/scripts/battery`)}</pre>`);
}

const DO = {
  home: () => act(() => api("/api/home", { body: {} }), tr("Back to Kindle", "Đã về Kindle", "返回 Kindle")),
  clear: () => act(() => api("/api/clear", { body: {} })),
  card: () => act(() => api("/api/card", { body: {} })),
  sleep: () => confirm(tr("Sleep turns Wi-Fi off. Wake it with the power button.", "Ngủ sẽ tắt Wi-Fi. Đánh thức bằng nút nguồn.", "休眠会关闭 Wi-Fi，用电源键唤醒。")) && act(() => api("/api/sleep", { body: {} })),
  reboot: () => confirm(tr("Restart the Kindle?", "Khởi động lại Kindle?", "重启 Kindle？")) && act(() => api("/api/reboot", { body: {} }), tr("Restarting…", "Đang khởi động lại…", "正在重启…")),
  fclear: () => confirm(tr("Remove all frame photos?", "Xoá hết ảnh trong khung?", "删除所有相框照片？")) && act(async () => { await api("/api/frame", { method: "DELETE" }); refreshStatus(); }),
  ntfygen: () => {
    const r = crypto.getRandomValues(new Uint8Array(6));
    $("#ntfy").value = "https://ntfy.sh/kindle-" + [...r].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 10);
  },
  ntfysave: () => act(async () => {
    settings = { ...settings, ntfy: $("#ntfy").value.trim() };
    await api("/api/settings", { body: settings });
    if (settings.ntfy) await api("/api/notify-test", { body: {} });
  }, tr("Saved — check your phone", "Đã lưu — xem điện thoại", "已保存 — 请查看手机")),
};

async function loadBooks() {
  const list = $("#blist");
  if (!list) return;
  const books = await api("/api/books").catch(() => []);
  const size = (n) => (n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB");
  list.innerHTML = books.length ? books.map((b) => `<div class="row"><div class="grow"><div class="name">${esc(b.name)}</div><small>${size(b.size)}</small></div>
    <button class="link danger" data-del="${esc(b.name)}">${tr("Delete", "Xoá", "删除")}</button></div>`).join("")
    : `<div class="empty">${tr("No books yet", "Chưa có sách", "还没有电子书")}</div>`;
  list.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    if (!confirm(tr(`Delete “${b.dataset.del}”?`, `Xoá “${b.dataset.del}”?`, `删除 “${b.dataset.del}”？`))) return;
    act(async () => { await api("/api/books?name=" + encodeURIComponent(b.dataset.del), { method: "DELETE" }); loadBooks(); });
  }));
}

function upload(url, files, progSel, done) {
  if (!files.length) return;
  const fd = new FormData();
  for (const f of files) fd.append("f", f, f.name);
  const xhr = new XMLHttpRequest();
  const prog = $(progSel);
  const idle = prog ? prog.textContent : "";
  xhr.upload.onprogress = (e) => { if (e.lengthComputable && prog) prog.textContent = Math.round((e.loaded / e.total) * 100) + "%"; };
  xhr.onload = () => {
    if (xhr.status === 200) toast(tr("Sent ✓", "Đã gửi ✓", "已发送 ✓"));
    else toast(xhr.responseText || "Error", true);
    if (prog) prog.textContent = idle;
    done();
  };
  xhr.onerror = () => toast(tr("Upload failed", "Gửi thất bại", "上传失败"), true);
  xhr.open("POST", url);
  xhr.send(fd);
}

$("#tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  tab = b.dataset.tab;
  $("#tabs").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
  renderTab();
  window.scrollTo(0, 0);
});

/* ---------- Boot ---------- */

// Network errors (TypeError) mean the Kindle is asleep or off Wi-Fi: wait and retry.
async function start() {
  clearTimeout(start.retry);
  try {
    status = await api("/api/status");
  } catch (e) {
    if (e instanceof TypeError) {
      if ($("#main").hidden) $("#away").hidden = false;
      start.retry = setTimeout(start, 5000);
    }
    return;
  }
  $("#away").hidden = true;
  $("#pair").hidden = true;
  $("#main").hidden = false;
  refreshStatus();
  refreshShot();
  renderTab();
  clearInterval(start.timer);
  start.timer = setInterval(refreshStatus, 20000);
}

window.addEventListener("online", () => ($("#main").hidden ? start() : refreshStatus()));

// Browsers only allow this over HTTPS (e.g. `tailscale serve`) or localhost.
if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
document.documentElement.lang = lang;
$("#pair p").textContent = tr("Enter the PIN shown on your Kindle.", "Nhập PIN hiện trên Kindle.", "输入 Kindle 上显示的 PIN。");
$("#away h1").textContent = tr("Kindle is offline", "Kindle đang offline", "Kindle 离线");
$("#away p").textContent = tr("Make sure it's awake and on Wi-Fi. Trying again…", "Đánh thức Kindle và bật Wi-Fi. Đang thử lại…", "请唤醒 Kindle 并连接 Wi-Fi，正在重试…");
for (const [k, en, vi, zh] of [["display", "Display", "Màn hình", "显示"], ["frame", "Frame", "Khung ảnh", "相框"], ["files", "Files", "Tệp", "文件"], ["apps", "Apps", "App", "应用"], ["device", "Device", "Thiết bị", "设备"]]) {
  const b = $(`#tabs [data-tab="${k}"]`);
  b.lastChild.textContent = tr(en, vi, zh);
}
start();
