"use strict";

/* ---------- Copy ---------- */

const T = {
  en: {
    heroKicker: "Kindle Unlocked",
    hero: "Your Kindle, <em>unlocked.</em>",
    heroLead: "Turn it into a tiny always-on computer. Unlock it from its own browser, then add apps with one line.",
    start: "Get started",
    s1: "Find your Kindle", s1d: "Serial + software version",
    s2: "Unlock it", s2d: "From the Kindle's browser",
    s3: "Add apps", s3d: "SSH, Tailscale, dashboards…",
    appsTitle: "Apps", seeAll: "See all",
    back: "Back", next: "Continue", done: "Done",
    step: "Step", of: "of",
    kindleQ: "Which Kindle?",
    kindleLead: "Type the first 8 characters of its serial number.",
    where: "On the Kindle:",
    pathInfo: ["Settings", "Device Options", "Device Info"],
    orPick: "Or pick it",
    badSerial: "Not recognised. Check the serial, or pick below.",
    fwQ: "Software version?",
    fwLead: "Same screen, just below the serial.",
    badFw: "Looks like 5.17.1 or 5.19.6.2",
    unlockKicker: "Best way for you",
    noPc: "No computer", needsUsb: "Needs computer + cable",
    needsReg: "Needs Amazon account", needsAds: "Needs lock-screen ads",
    others: "Other options:",
    openGuide: "Open full guide",
    usbLead: "This one needs a computer and a USB cable. Follow the guide, then come back.",
    aiTitle: "Have an AI agent?",
    aiLead: "Claude Code, Codex, Cursor… Plug the Kindle into your computer, then paste this to the agent.",
    aiPrompt: "My Kindle {name} on software {fw} is plugged into this computer by USB. Jailbreak it with {method}, following {guide}. Find the Kindle's USB drive, download the files the guide links to, check what they do, copy them to the Kindle and eject it safely. Don't touch other files on the Kindle and don't install firmware updates. Also download https://kindle.trinh.uk/ku-setup.sh into the Kindle's documents folder: after the jailbreak, I open it from the Library to connect the app store. Then tell me step by step what to do on the Kindle itself.",
    copy: "Copy prompt", copied: "Copied",
    orSelf: "Or do it yourself:",
    noneTitle: "Not yet.",
    noneLead: "There's no unlock for this Kindle and version yet.",
    noneTip1: "Don't update it. Turn on Airplane mode to stay on this version.",
    noneTip2: "New methods appear every few months — check back here.",
    beforeTitle: "Before you start",
    before: "Wi-Fi on, battery above 50%.",
    jbDone: "Finished? Continue",
    storeQ: "Connect the app store",
    storeLead: "On the Kindle's <b>Home</b> screen, tap the search bar at the top and type each line, then press Enter.",
    homeOk: "Home screen search bar", browserNo: "Not the web browser's address bar",
    check: "Installs <b>HTTP Server</b> to manage the Kindle from your phone",
    fbTitle: "Nothing happens? Use a computer instead",
    pcLead: "You unlocked it with a computer, so use the computer once more. This connects the store and installs HTTP Server.",
    typeTitle: "Or type commands on the Kindle",
    typeNote: "On older software (like 5.12) the Kindle ignores commands with a dot in them, so step 2 does nothing there.",
    fb1: "Download the setup file", fb2: "Plug the Kindle into the computer. Copy the file into the Kindle's <b>documents</b> folder, then eject it.",
    fb3: "Turn Wi-Fi on, open the Library and tap <b>ku-setup</b>. It connects the store and installs HTTP Server, then shows a QR code for your phone.",
    restart: "Restart the Kindle once, then turn Wi-Fi on.",
    restartHint: "Settings → Device Options → Restart",
    type: "Type in the search bar",
    storeDone: "Choose apps",
    appsQ: "Pick your apps",
    appsLead: "Easiest: install and control everything from your phone.",
    ph1: "On the Kindle, open the Library and tap <b>HTTP Server</b>. A QR code appears.",
    ph2: "Scan it with your phone camera and add the page to your Home Screen.",
    ph3: "Open the <b>Apps</b> tab and tap Install. No typing on the Kindle.",
    orManual: "Or install from the Kindle's search bar: tap an app below.",
    install: "Install",
    installType: "In the Kindle search bar, type",
    openIt: "Open your Library and tap",
    firstTime: "First time? Connect the app store first.",
    connect: "Connect store",
    close: "Close",
    mac1: "Install <b>HTTP Server</b> on the Kindle (with Remote on).", mac2: "In Remote, open Device → “API token + examples”.", mac3: "On your computer, run one line:",
    official: "OFFICIAL",
    detect: "Kindle",
    foot: 'Unlock methods by the <a href="https://kindlemodding.org" target="_blank" rel="noopener">KindleModding</a> community. <a href="https://github.com/ptrinh/kindle-unlocked" target="_blank" rel="noopener">GitHub Open Source</a>.',
  },
  vi: {
    heroKicker: "Kindle Unlocked",
    hero: "Kindle của bạn, <em>tự do.</em>",
    heroLead: "Biến Kindle thành một máy tính nhỏ luôn bật. Mở khoá ngay trên trình duyệt của Kindle, rồi cài app chỉ với một dòng lệnh.",
    start: "Bắt đầu",
    s1: "Nhận diện Kindle", s1d: "Số serial + phiên bản phần mềm",
    s2: "Mở khoá", s2d: "Ngay trên trình duyệt Kindle",
    s3: "Cài app", s3d: "SSH, Tailscale, dashboard…",
    appsTitle: "Ứng dụng", seeAll: "Xem tất cả",
    back: "Quay lại", next: "Tiếp tục", done: "Xong",
    step: "Bước", of: "/",
    kindleQ: "Kindle nào?",
    kindleLead: "Nhập 8 ký tự đầu của số serial.",
    where: "Trên Kindle:",
    pathInfo: ["Settings", "Device Options", "Device Info"],
    orPick: "Hoặc chọn",
    badSerial: "Không nhận ra. Kiểm tra lại, hoặc chọn bên dưới.",
    fwQ: "Phiên bản phần mềm?",
    fwLead: "Cùng màn hình, ngay dưới số serial.",
    badFw: "Dạng như 5.17.1 hoặc 5.19.6.2",
    unlockKicker: "Cách phù hợp nhất",
    noPc: "Không cần máy tính", needsUsb: "Cần máy tính + cáp",
    needsReg: "Cần tài khoản Amazon", needsAds: "Cần quảng cáo màn khoá",
    others: "Cách khác:",
    openGuide: "Mở hướng dẫn",
    usbLead: "Cách này cần máy tính và cáp USB. Làm theo hướng dẫn rồi quay lại đây.",
    aiTitle: "Có AI agent?",
    aiLead: "Claude Code, Codex, Cursor… Cắm Kindle vào máy tính, rồi dán đoạn này cho agent.",
    aiPrompt: "Kindle {name}, phần mềm {fw}, đang cắm USB vào máy này. Jailbreak nó bằng {method} theo hướng dẫn {guide}. Tìm ổ USB của Kindle, tải các file hướng dẫn đưa, kiểm tra chúng làm gì, chép vào Kindle rồi tháo ra an toàn. Không đụng file khác trên Kindle, không cài bản cập nhật firmware. Tải thêm https://kindle.trinh.uk/ku-setup.sh vào thư mục documents của Kindle: jailbreak xong tôi mở nó trong Library để kết nối kho app. Sau đó hướng dẫn tôi từng bước cần làm trên Kindle.",
    copy: "Chép prompt", copied: "Đã chép",
    orSelf: "Hoặc tự làm:",
    noneTitle: "Chưa có.",
    noneLead: "Chưa có cách mở khoá cho Kindle và phiên bản này.",
    noneTip1: "Đừng cập nhật. Bật Airplane mode để giữ nguyên phiên bản.",
    noneTip2: "Cách mới thường ra sau vài tháng — quay lại đây kiểm tra.",
    beforeTitle: "Trước khi bắt đầu",
    before: "Bật Wi-Fi, pin trên 50%.",
    jbDone: "Xong rồi? Tiếp tục",
    storeQ: "Kết nối kho app",
    storeLead: "Ở màn hình <b>Home</b> của Kindle, chạm thanh tìm kiếm trên cùng, gõ từng dòng rồi nhấn Enter.",
    homeOk: "Thanh tìm kiếm ở màn hình Home", browserNo: "Không phải thanh địa chỉ của trình duyệt",
    check: "Cài <b>HTTP Server</b> để quản lý Kindle từ điện thoại",
    fbTitle: "Gõ mà không thấy gì? Dùng máy tính",
    pcLead: "Bạn đã mở khoá bằng máy tính, nên dùng máy tính thêm một lần nữa. Bước này kết nối kho app và cài HTTP Server.",
    typeTitle: "Hoặc gõ lệnh trên Kindle",
    typeNote: "Trên phần mềm cũ (như 5.12), Kindle bỏ qua lệnh có dấu chấm, nên bước 2 sẽ không chạy.",
    fb1: "Tải file cài đặt", fb2: "Cắm Kindle vào máy tính. Chép file vào thư mục <b>documents</b> của Kindle, rồi tháo ra.",
    fb3: "Bật Wi-Fi, mở Library và chạm <b>ku-setup</b>. Nó kết nối kho app, cài HTTP Server rồi hiện mã QR cho điện thoại.",
    restart: "Khởi động lại Kindle một lần, rồi bật Wi-Fi.",
    restartHint: "Settings → Device Options → Restart",
    type: "Gõ vào thanh tìm kiếm",
    storeDone: "Chọn app",
    appsQ: "Chọn app",
    appsLead: "Dễ nhất: cài và điều khiển mọi thứ từ điện thoại.",
    ph1: "Trên Kindle, mở Library và chạm <b>HTTP Server</b>. Mã QR sẽ hiện ra.",
    ph2: "Quét bằng camera điện thoại, rồi thêm trang ra màn hình chính.",
    ph3: "Mở tab <b>Apps</b> và chạm Cài. Khỏi gõ gì trên Kindle.",
    orManual: "Hoặc cài từ thanh tìm kiếm của Kindle: chạm vào app bên dưới.",
    install: "Cài đặt",
    installType: "Gõ vào thanh tìm kiếm Kindle",
    openIt: "Mở Thư viện và chạm",
    firstTime: "Lần đầu? Kết nối kho app trước.",
    connect: "Kết nối kho",
    close: "Đóng",
    mac1: "Cài <b>HTTP Server</b> trên Kindle (bật Remote).", mac2: "Trong Remote, mở Thiết bị → “API token + ví dụ”.", mac3: "Trên máy tính, chạy một dòng:",
    official: "CHÍNH THỨC",
    detect: "Kindle",
    foot: 'Các cách mở khoá do cộng đồng <a href="https://kindlemodding.org" target="_blank" rel="noopener">KindleModding</a> phát triển. <a href="https://github.com/ptrinh/kindle-unlocked" target="_blank" rel="noopener">Mã nguồn mở trên GitHub</a>.',
  },
};

T.zh = {
  heroKicker: "Kindle Unlocked",
  hero: "你的 Kindle，<em>解锁自由。</em>",
  heroLead: "把它变成一台常亮的小电脑。直接在 Kindle 自带浏览器里解锁，然后一行命令安装应用。",
  start: "开始",
  s1: "识别你的 Kindle", s1d: "序列号 + 软件版本",
  s2: "解锁", s2d: "在 Kindle 浏览器里完成",
  s3: "安装应用", s3d: "SSH、Tailscale、仪表盘…",
  appsTitle: "应用", seeAll: "查看全部",
  back: "返回", next: "继续", done: "完成",
  step: "步骤", of: "/",
  kindleQ: "哪一款 Kindle？",
  kindleLead: "输入序列号的前 8 个字符。",
  where: "在 Kindle 上：",
  pathInfo: ["设置", "设备选项", "设备信息"],
  orPick: "或直接选择",
  badSerial: "无法识别。请检查序列号，或在下方选择。",
  fwQ: "软件版本？",
  fwLead: "就在同一页，序列号下方。",
  badFw: "格式如 5.17.1 或 5.19.6.2",
  unlockKicker: "最适合你的方式",
  noPc: "无需电脑", needsUsb: "需要电脑 + 数据线",
  needsReg: "需要亚马逊账号", needsAds: "需要锁屏广告",
  others: "其他方式：",
  openGuide: "打开完整教程",
  usbLead: "这种方式需要电脑和 USB 数据线。按教程操作后回到这里。",
  aiTitle: "有 AI 助手？",
  aiLead: "Claude Code、Codex、Cursor… 把 Kindle 连上电脑，然后把这段话粘贴给它。",
  aiPrompt: "我的 Kindle {name}（软件版本 {fw}）已通过 USB 连接到这台电脑。请按照 {guide} 用 {method} 越狱它。找到 Kindle 的 USB 磁盘，下载教程里链接的文件，检查它们的作用，复制到 Kindle 并安全弹出。不要改动 Kindle 上的其他文件，也不要安装固件更新。另外把 https://kindle.trinh.uk/ku-setup.sh 下载到 Kindle 的 documents 文件夹：越狱后我在图书馆打开它来连接应用商店。然后一步步告诉我在 Kindle 上要做什么。",
  copy: "复制提示词", copied: "已复制",
  orSelf: "或者自己动手：",
  noneTitle: "暂时没有。",
  noneLead: "这款 Kindle 和版本目前还没有解锁方法。",
  noneTip1: "不要更新。打开飞行模式以保持当前版本。",
  noneTip2: "新方法通常几个月就会出现，记得回来看看。",
  beforeTitle: "开始之前",
  before: "打开 Wi-Fi，电量高于 50%。",
  jbDone: "完成了？继续",
  storeQ: "连接应用商店",
  storeLead: "在 Kindle <b>主屏</b>点击顶部的搜索栏，逐行输入并按回车。",
  homeOk: "主屏搜索栏", browserNo: "不是浏览器的地址栏",
  check: "安装 <b>HTTP Server</b>，用手机管理 Kindle",
  fbTitle: "输入后没反应？改用电脑",
  pcLead: "你是用电脑解锁的，那就再用一次电脑。这一步会连接应用商店并安装 HTTP Server。",
  typeTitle: "或者在 Kindle 上输入命令",
  typeNote: "在较旧的系统（如 5.12）上，Kindle 会忽略含有句点的命令，所以第 2 步不会生效。",
  fb1: "下载安装文件", fb2: "把 Kindle 连上电脑，把文件复制到 Kindle 的 <b>documents</b> 文件夹，然后弹出。",
  fb3: "打开 Wi-Fi，进入图书馆，点击 <b>ku-setup</b>。它会连接应用商店并安装 HTTP Server，然后显示二维码供手机扫描。",
  restart: "先重启一次 Kindle，然后打开 Wi-Fi。",
  restartHint: "设置 → 设备选项 → 重启",
  type: "在搜索栏输入",
  storeDone: "选择应用",
  appsQ: "选择应用",
  appsLead: "最简单：用手机安装和控制一切。",
  ph1: "在 Kindle 上打开图书馆，点击 <b>HTTP Server</b>，会显示二维码。",
  ph2: "用手机相机扫描，并把页面添加到主屏幕。",
  ph3: "打开 <b>Apps</b> 标签，点安装。无需在 Kindle 上输入。",
  orManual: "或者在 Kindle 搜索栏安装：点下面的应用。",
  install: "安装",
  installType: "在 Kindle 搜索栏输入",
  openIt: "打开图书馆并点击",
  firstTime: "第一次？请先连接应用商店。",
  connect: "连接商店",
  close: "关闭",
  mac1: "在 Kindle 上安装 <b>HTTP Server</b>（开启 Remote）。", mac2: "在 Remote 中打开 设备 → “API token + 示例”。", mac3: "在电脑上运行一行命令：",
  official: "官方",
  detect: "Kindle",
  foot: '解锁方法由 <a href="https://kindlemodding.org" target="_blank" rel="noopener">KindleModding</a> 社区开发。<a href="https://github.com/ptrinh/kindle-unlocked" target="_blank" rel="noopener">GitHub 开源</a>。',
};

const LANGS = [["en", "EN"], ["zh", "中文"], ["vi", "VI"]];
let lang = /^vi/i.test(navigator.language || "") ? "vi" : /^zh/i.test(navigator.language || "") ? "zh" : "en";
try { const v = localStorage.getItem("ku.lang"); if (T[v]) lang = v; } catch (e) {}
const t = (k) => T[lang][k] ?? T.en[k];
const L = (o) => (typeof o === "string" ? o : o[lang] ?? o.en);

/* ---------- Data ---------- */

const ICONS = {
  dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/></svg>',
  tailscale: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="5" r="2.3"/><circle cx="12" cy="5" r="2.3" opacity=".4"/><circle cx="19" cy="5" r="2.3" opacity=".4"/><circle cx="5" cy="12" r="2.3"/><circle cx="12" cy="12" r="2.3"/><circle cx="19" cy="12" r="2.3"/><circle cx="5" cy="19" r="2.3" opacity=".4"/><circle cx="12" cy="19" r="2.3"/><circle cx="19" cy="19" r="2.3" opacity=".4"/></svg>',
  ssh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="16" rx="3"/><path d="m7 10 3 2.5L7 15M12.5 15H17"/></svg>',
  http: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></svg>',
  awake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
  board: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/><path d="M8 9h8M8 13h5"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 14h3M7.5 17.5h6"/></svg>',
  pulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2.5-6 5 12 2.5-6h4"/></svg>',
  mirror: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="13" height="9" rx="1.5"/><path d="M6 17h5M8.5 13v4"/><rect x="17" y="7" width="5" height="13" rx="1.2"/></svg>',
  update: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  term: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 7 5 5-5 5M12 19h7"/></svg>',
};

const APPS = [
  {
    id: "ku-dash", name: "Dashboard", icon: "dash", g: "linear-gradient(135deg,#3a3a3c,#0b0b0c)",
    sub: { en: "Always-on web page", vi: "Trang web luôn bật" },
    desc: { en: "Shows a web page full screen and keeps the Kindle awake. Clock, weather — or any URL you like.", vi: "Hiện một trang web toàn màn hình và giữ Kindle luôn thức. Đồng hồ, thời tiết — hoặc URL bất kỳ." },
    use: { en: "The demo dashboard opens. Tap Dashboard again to exit.", vi: "Dashboard mẫu sẽ mở ra. Chạm Dashboard lần nữa để thoát." },
    note: { en: "Use your own page: put its URL in <code>unlocked/dash/url.txt</code>. Preview: <a href=\"/d\" target=\"_blank\">kindle.trinh.uk/d</a>", vi: "Dùng trang riêng: ghi URL vào <code>unlocked/dash/url.txt</code>. Xem thử: <a href=\"/d\" target=\"_blank\">kindle.trinh.uk/d</a>" },
  },
  {
    id: "ku-tailscale", name: "Tailscale", icon: "tailscale", g: "linear-gradient(135deg,#4b4bff,#1a1a40)",
    sub: { en: "Reach it from anywhere", vi: "Truy cập từ mọi nơi" },
    desc: { en: "Puts your Kindle on your private Tailscale network, so SSH and the web server work from anywhere.", vi: "Đưa Kindle vào mạng riêng Tailscale, để SSH và web server dùng được từ mọi nơi." },
    use: { en: "A login link appears on the Kindle. Open it on your phone. Then the Kindle shows its address.", vi: "Kindle hiện một link đăng nhập. Mở link đó trên điện thoại. Sau đó Kindle hiện địa chỉ của nó." },
    note: { en: "Install downloads ~30 MB from tailscale.com. No login link? Put an auth key in <code>unlocked/tailscale/authkey.txt</code>.", vi: "Khi cài sẽ tải ~30 MB từ tailscale.com. Muốn bỏ qua link đăng nhập? Ghi auth key vào <code>unlocked/tailscale/authkey.txt</code>." },
  },
  {
    id: "ku-ssh", name: "SSH", icon: "ssh", g: "linear-gradient(135deg,#1f9d55,#0b3d24)",
    sub: { en: "Terminal + file transfer", vi: "Terminal + chép file" },
    desc: { en: "Log in to your Kindle from a computer, and copy files with SFTP.", vi: "Đăng nhập Kindle từ máy tính, chép file bằng SFTP." },
    use: { en: "The Kindle shows its address and a password. On your computer run the ssh line it shows.", vi: "Kindle hiện địa chỉ và mật khẩu. Trên máy tính, chạy dòng ssh hiện trên màn hình." },
    note: { en: "Prefer keys? Add yours to <code>unlocked/ssh/authorized_keys</code>.", vi: "Dùng key? Thêm vào <code>unlocked/ssh/authorized_keys</code>." },
  },
  {
    id: "ku-http", name: "HTTP Server", icon: "http", g: "linear-gradient(135deg,#ff8a00,#a33b00)",
    sub: { en: "Remote control + web hosting", vi: "Điều khiển từ xa + chạy web" },
    desc: { en: "Control your Kindle from your phone: show photos, PDFs, notes and drawings, run a photo frame, send books, get a ping when it's online. Also hosts your own website.", vi: "Điều khiển Kindle từ điện thoại: hiện ảnh, PDF, ghi chú, nét vẽ, chạy khung ảnh, gửi sách, báo khi Kindle online. Kèm chạy website của riêng bạn." },
    use: { en: "A QR code appears on the Kindle. Scan it with your phone — done. Add the page to your Home Screen.", vi: "Kindle hiện mã QR. Quét bằng điện thoại là xong. Thêm trang đó ra màn hình chính." },
    note: { en: "Only want the website? Tap <b>HTTP Server Settings</b> to switch the Remote app off. Scripts in <code>unlocked/scripts</code> become buttons; there's an HTTP API too.", vi: "Chỉ cần website? Chạm <b>HTTP Server Settings</b> để tắt Remote. Script trong <code>unlocked/scripts</code> thành nút bấm; có cả HTTP API." },
  },
  {
    id: "ku-awake", name: "Stay Awake", icon: "awake", g: "linear-gradient(135deg,#ffd60a,#b37400)",
    sub: { en: "Never sleep", vi: "Không bao giờ ngủ" },
    desc: { en: "Stops the Kindle from sleeping, so Wi-Fi stays on. Best while plugged in.", vi: "Không cho Kindle ngủ, để Wi-Fi luôn bật. Nên cắm sạc khi dùng." },
    use: { en: "Tap Stay Awake again to allow sleep.", vi: "Chạm Stay Awake lần nữa để cho ngủ lại." },
  },
  {
    id: "ku-board", name: "Message Board", icon: "board", g: "linear-gradient(135deg,#ff375f,#7a0a2a)",
    sub: { en: "Family notes & photos", vi: "Lời nhắn & ảnh gia đình", zh: "家庭留言与照片" },
    desc: { en: "Turn the Kindle into a fridge-door board. Anyone with the link can send a note or photo from their phone — perfect for grandparents.", vi: "Biến Kindle thành bảng tin gia đình. Ai có link đều gửi được lời nhắn hoặc ảnh từ điện thoại — rất hợp cho ông bà.", zh: "把 Kindle 变成冰箱门上的留言板。有链接的人都能用手机发送留言或照片——很适合送给长辈。" },
    use: { en: "The Kindle shows a QR code. Share that link with family; new messages appear within a minute.", vi: "Kindle hiện mã QR. Chia sẻ link đó cho cả nhà; tin mới hiện trong vòng một phút.", zh: "Kindle 会显示二维码。把链接分享给家人，新留言一分钟内出现。" },
    note: { en: "Rename it in Remote → Device → Apps → Message Board.", vi: "Đổi tên ở Remote → Thiết bị → Ứng dụng → Message Board.", zh: "可在 Remote → 设备 → 应用 → Message Board 中改名。" },
  },
  {
    id: "ku-calendar", name: "Calendar", icon: "cal", g: "linear-gradient(135deg,#ff9f0a,#8a3b00)",
    sub: { en: "Agenda + to-dos", vi: "Lịch + việc cần làm", zh: "日程 + 待办" },
    desc: { en: "Today's date, your agenda from Google Calendar (or any iCal link) and Todoist tasks, always on.", vi: "Ngày hôm nay, lịch từ Google Calendar (hoặc link iCal bất kỳ) và việc cần làm Todoist, luôn hiển thị.", zh: "今天的日期、Google 日历（或任何 iCal 链接）的日程和 Todoist 待办，常亮显示。" },
    use: { en: "Add your calendar's iCal link in Remote → Device → Apps → Calendar.", vi: "Thêm link iCal của lịch ở Remote → Thiết bị → Ứng dụng → Calendar.", zh: "在 Remote → 设备 → 应用 → Calendar 中添加日历的 iCal 链接。" },
    note: { en: "Google Calendar: Settings → your calendar → “Secret address in iCal format”.", vi: "Google Calendar: Cài đặt → lịch của bạn → “Địa chỉ bí mật ở định dạng iCal”.", zh: "Google 日历：设置 → 你的日历 → “iCal 格式的私密地址”。" },
  },
  {
    id: "ku-ha", name: "Home Assistant", icon: "home", g: "linear-gradient(135deg,#18bcf2,#03507a)",
    sub: { en: "Smart-home panel", vi: "Bảng nhà thông minh", zh: "智能家居面板" },
    desc: { en: "Your Home Assistant sensors and switches on a wall panel that lasts weeks per charge.", vi: "Cảm biến và công tắc Home Assistant trên một bảng treo tường.", zh: "把 Home Assistant 的传感器和开关显示在墙上的面板上。" },
    use: { en: "Add your HA address, a long-lived token and the entities in Remote → Device → Apps → Home Assistant.", vi: "Thêm địa chỉ HA, long-lived token và các entity ở Remote → Thiết bị → Ứng dụng → Home Assistant.", zh: "在 Remote → 设备 → 应用 → Home Assistant 中填写 HA 地址、长期令牌和实体。" },
    note: { en: "Token: Home Assistant → Profile → Security → Long-lived access tokens.", vi: "Token: Home Assistant → Hồ sơ → Bảo mật → Long-lived access tokens.", zh: "令牌：Home Assistant → 个人资料 → 安全 → 长期访问令牌。" },
  },
  {
    id: "ku-monitor", name: "Monitor", icon: "pulse", g: "linear-gradient(135deg,#64d2ff,#0b3a5a)",
    sub: { en: "Is everything up?", vi: "Mọi thứ còn chạy?", zh: "服务都正常吗？" },
    desc: { en: "Checks your websites and servers every minute, with a history bar for each and a phone alert when something goes down.", vi: "Kiểm tra website và server mỗi phút, có lịch sử cho từng cái và báo về điện thoại khi có sự cố.", zh: "每分钟检查网站和服务器，显示历史记录，出故障时推送到手机。" },
    use: { en: "List what to check in Remote → Device → Apps → Monitor.", vi: "Khai báo những gì cần kiểm tra ở Remote → Thiết bị → Ứng dụng → Monitor.", zh: "在 Remote → 设备 → 应用 → Monitor 中列出要检查的服务。" },
    note: { en: "Alerts: put an ntfy topic URL in <code>ntfy</code>.", vi: "Cảnh báo: điền URL topic ntfy vào <code>ntfy</code>.", zh: "告警：在 <code>ntfy</code> 中填入 ntfy topic 地址。" },
  },
  {
    id: "mirror", name: "PC Mirror", icon: "mirror", g: "linear-gradient(135deg,#8e8e93,#2c2c2e)", mac: true,
    sub: { en: "Mac & Windows on e-ink", vi: "Mac & Windows lên e-ink", zh: "把电脑投到墨水屏" },
    desc: { en: "Shows your computer screen — or just a part of it — on the Kindle. Works on Mac and Windows. Great for docs, notes or a terminal without eye strain.", vi: "Hiện màn hình máy tính — hoặc một phần — lên Kindle. Chạy trên Mac và Windows. Đọc tài liệu, ghi chú hay terminal mà không mỏi mắt.", zh: "把电脑屏幕（或其中一部分）显示在 Kindle 上，支持 Mac 和 Windows。看文档、笔记或终端不累眼。" },
    note: { en: "Needs the HTTP Server app with Remote on.", vi: "Cần app HTTP Server và bật Remote.", zh: "需要安装 HTTP Server 并开启 Remote。" },
  },
  {
    id: "ku-update", name: "Update Apps", icon: "update", g: "linear-gradient(135deg,#30d158,#0a4a22)",
    sub: { en: "One tap updates", vi: "Cập nhật một chạm", zh: "一键更新" },
    desc: { en: "Updates every installed app — ours and the official ones — with one tap.", vi: "Cập nhật mọi app đã cài — của mình và app chính thức — chỉ với một chạm.", zh: "一键更新所有已安装的应用（包括官方应用）。" },
    use: { en: "Tap Update Apps whenever you like.", vi: "Chạm Update Apps bất cứ lúc nào.", zh: "随时点 Update Apps 即可。" },
  },
  {
    id: "koreader", name: "KOReader", icon: "book", g: "linear-gradient(135deg,#e5e5ea,#8e8e93)", official: true,
    sub: { en: "A far better reader", vi: "Trình đọc mạnh hơn" },
    desc: { en: "The popular open-source reader: EPUB, PDF, comics, dictionaries, sync.", vi: "Trình đọc mã nguồn mở nổi tiếng: EPUB, PDF, truyện tranh, từ điển, đồng bộ." },
  },
  {
    id: "kterm", name: "kterm", icon: "term", g: "linear-gradient(135deg,#2c2c2e,#000)", official: true,
    sub: { en: "Terminal on the Kindle", vi: "Terminal ngay trên Kindle" },
    desc: { en: "A full terminal with on-screen keyboard, right on the Kindle.", vi: "Terminal đầy đủ với bàn phím ảo, ngay trên Kindle." },
  },
];

// Jailbreaks that run entirely from the Kindle's own browser.
const EASY = {
  SpiderCat: {
    url: "kindlemodding.org/spidercat",
    steps: {
      en: [["Open the Kindle's web browser and go to", "url"], ["Download the book it offers."], ["Open that book from your Library.", "Keep Wi-Fi on. The Kindle restarts by itself."]],
      vi: [["Mở trình duyệt trên Kindle và vào", "url"], ["Tải cuốn sách trang đó đưa ra."], ["Mở cuốn sách đó trong Thư viện.", "Giữ Wi-Fi bật. Kindle sẽ tự khởi động lại."]],
    },
  },
  "Véra": {
    url: "kindlemodding.org/vera",
    steps: {
      en: [["Open the Kindle's web browser and go to", "url"], ["Pick your model and version, then download both books."], ["Open “Font Calibration” and set the font exactly as it says. Save it as a theme."], ["Open the Véra book.", "Wait for “RESTARTING GUI”. That's it."]],
      vi: [["Mở trình duyệt trên Kindle và vào", "url"], ["Chọn model và phiên bản, rồi tải cả hai cuốn sách."], ["Mở “Font Calibration”, chỉnh font đúng như hướng dẫn trong sách. Lưu thành theme."], ["Mở cuốn Véra.", "Chờ dòng “RESTARTING GUI” là xong."]],
    },
  },
  Sanctuary: {
    url: "sanctuary.skyvincent.com",
    steps: {
      en: [["Open the Kindle's web browser and go to", "url"], ["Wait while it scans (up to 20 min), then type the ID it shows."], ["Go to Settings → Help → Getting Started.", "The unlock runs from there."]],
      vi: [["Mở trình duyệt trên Kindle và vào", "url"], ["Chờ quét (tối đa 20 phút), rồi nhập mã ID nó hiện ra."], ["Vào Settings → Help → Getting Started.", "Việc mở khoá chạy từ đó."]],
    },
  },
};
const EASY_ORDER = ["SpiderCat", "Véra", "Sanctuary"];

// Chinese copy for apps and on-device unlock steps.
const ZH_APPS = {
  "ku-dash": { sub: "常亮网页", desc: "全屏显示一个网页并让 Kindle 保持唤醒。时钟、天气，或任何网址。", use: "示例仪表盘会打开。再点一次 Dashboard 退出。", note: "使用自己的页面：把网址写进 <code>unlocked/dash/url.txt</code>。预览：<a href=\"/d\" target=\"_blank\">kindle.trinh.uk/d</a>" },
  "ku-tailscale": { sub: "随时随地访问", desc: "把 Kindle 加入你的 Tailscale 私有网络，SSH 和网页服务在任何地方都能用。", use: "Kindle 会显示一个登录链接，用手机打开它。之后 Kindle 会显示自己的地址。", note: "安装时会从 tailscale.com 下载约 30 MB。不想用登录链接？把 auth key 写进 <code>unlocked/tailscale/authkey.txt</code>。" },
  "ku-ssh": { sub: "终端 + 文件传输", desc: "从电脑登录 Kindle，并用 SFTP 传文件。", use: "Kindle 会显示地址和密码。在电脑上运行屏幕上的 ssh 命令。", note: "想用密钥？把公钥加到 <code>unlocked/ssh/authorized_keys</code>。" },
  "ku-http": { sub: "远程控制 + 网站托管", desc: "用手机控制 Kindle：显示照片、PDF、笔记和手绘，运行相框，发送电子书，上线时提醒你。还能托管你自己的网站。", use: "Kindle 会显示二维码，用手机扫一下即可。把页面添加到主屏幕。", note: "只要网站？点 <b>HTTP Server Settings</b> 关闭 Remote。<code>unlocked/scripts</code> 里的脚本会变成按钮，还有 HTTP API。" },
  "ku-awake": { sub: "永不休眠", desc: "阻止 Kindle 休眠，让 Wi-Fi 保持连接。建议插电使用。", use: "再点一次 Stay Awake 恢复休眠。" },
  koreader: { sub: "更强大的阅读器", desc: "热门开源阅读器：EPUB、PDF、漫画、词典、同步。" },
  kterm: { sub: "Kindle 上的终端", desc: "带屏幕键盘的完整终端，直接在 Kindle 上运行。" },
};
const ZH_STEPS = {
  SpiderCat: [["打开 Kindle 浏览器，访问", "url"], ["下载页面提供的那本书。"], ["在图书馆里打开这本书。", "保持 Wi-Fi 开启，Kindle 会自动重启。"]],
  "Véra": [["打开 Kindle 浏览器，访问", "url"], ["选择型号和版本，然后下载两本书。"], ["打开 “Font Calibration”，严格按书里说的设置字体，并保存为主题。"], ["打开 Véra 那本书。", "看到 “RESTARTING GUI” 就完成了。"]],
  Sanctuary: [["打开 Kindle 浏览器，访问", "url"], ["等待扫描（最多 20 分钟），然后输入显示的 ID。"], ["进入 设置 → 帮助 → 入门指南。", "解锁会从那里开始。"]],
};
for (const a of APPS) for (const k in ZH_APPS[a.id] || {}) if (a[k]) a[k].zh = ZH_APPS[a.id][k];
for (const k in ZH_STEPS) EASY[k].steps.zh = ZH_STEPS[k];

const PICK = [
  ["KT7", "Kindle", "2026"], ["PW6", "Paperwhite", "2024"], ["CS", "Colorsoft", "2024"], ["KT6", "Kindle", "2024"],
  ["KS2", "Scribe", "2024"], ["KS3", "Scribe", "2025"], ["KSC", "Scribe Colorsoft", "2025"], ["PW5", "Paperwhite", "2021"],
  ["KT5", "Kindle", "2022"], ["KS", "Scribe", "2022"], ["KOA3", "Oasis", "2019"], ["PW4", "Paperwhite", "2018"], ["KT4", "Kindle", "2019"],
];

// Where to type ;kpm commands: Home search bar, not the browser's address bar.
const KINDLE_HOME = `<svg viewBox="0 0 240 300" role="img" aria-hidden="true">
  <rect x="4" y="4" width="232" height="292" rx="18" fill="#1c1c1e"/><rect x="20" y="20" width="200" height="246" rx="3" fill="#e8e8e3"/>
  <text x="30" y="36" font-size="9" fill="#555">Your Kindle</text><text x="208" y="36" font-size="9" fill="#555" text-anchor="end">11:02</text>
  <rect x="28" y="46" width="184" height="26" rx="3" fill="#fff" stroke="#30d158" stroke-width="3"/>
  <circle cx="41" cy="58" r="5" fill="none" stroke="#333" stroke-width="1.6"/><path d="m45 62 4 4" stroke="#333" stroke-width="1.6"/>
  <text x="56" y="63" font-size="11" font-family="monospace" fill="#111">;kpm update</text>
  <g fill="#c7c7c2"><rect x="30" y="88" width="40" height="58"/><rect x="78" y="88" width="40" height="58"/><rect x="126" y="88" width="40" height="58"/><rect x="174" y="88" width="36" height="58"/>
  <rect x="30" y="160" width="40" height="58"/><rect x="78" y="160" width="40" height="58"/><rect x="126" y="160" width="40" height="58"/><rect x="174" y="160" width="36" height="58"/></g>
  <circle cx="212" cy="58" r="15" fill="#30d158"/><path d="m205 58 5 5 9-10" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
const KINDLE_BROWSER = `<svg viewBox="0 0 240 300" role="img" aria-hidden="true">
  <rect x="4" y="4" width="232" height="292" rx="18" fill="#1c1c1e"/><rect x="20" y="20" width="200" height="246" rx="3" fill="#e8e8e3"/>
  <text x="30" y="36" font-size="9" fill="#555">Browser</text><text x="208" y="36" font-size="9" fill="#555" text-anchor="end">11:01</text>
  <path d="M30 56 37 50 44 56M32 55v8h10v-8" fill="none" stroke="#333" stroke-width="1.5"/><path d="M62 57h-10m4-4-4 4 4 4" fill="none" stroke="#333" stroke-width="1.5"/>
  <rect x="96" y="46" width="116" height="24" rx="2" fill="#fff" stroke="#ff453a" stroke-width="3"/>
  <text x="104" y="62" font-size="10" font-family="monospace" fill="#111">;kpm update</text>
  <rect x="46" y="120" width="148" height="76" fill="#fff" stroke="#333"/><text x="56" y="140" font-size="10" font-weight="700" fill="#111">Invalid Protocol</text>
  <rect x="56" y="150" width="124" height="5" fill="#bbb"/><rect x="56" y="160" width="110" height="5" fill="#bbb"/><text x="176" y="186" font-size="9" fill="#111" text-anchor="end">OK</text>
  <circle cx="212" cy="58" r="15" fill="#ff453a"/><path d="m206 52 12 12m0-12-12 12" stroke="#000" stroke-width="3" stroke-linecap="round"/>
</svg>`;

let MODELS = [];
let JAILBREAKS = [];

const state = load();
function load() {
  try { return JSON.parse(localStorage.getItem("ku.state")) || {}; } catch (e) { return {}; }
}
function save() {
  try { localStorage.setItem("ku.state", JSON.stringify(state)); } catch (e) {}
}

/* ---------- Logic ---------- */

function modelFromSerial(raw) {
  const s = raw.toUpperCase().replace(/\s/g, "");
  let sv, code;
  if (s[0] === "G") {
    if (s.length < 6) return null;
    sv = 1; code = s.substring(3, 6);
  } else if (/^[0-9A-F]/.test(s)) {
    if (s.length < 4) return null;
    sv = 0; code = s.substring(2, 4);
  } else return false;
  return MODELS.find((m) => m.sv >= sv && m.codes.includes(code)) || false;
}

function cmpVer(a, b) {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d;
  }
  return 0;
}

function matches(jb, model, fw) {
  if (!jb.models.includes(model)) return false;
  return jb.firmwares.some((r) => {
    if (!r.models.includes("all") && !r.models.includes(model)) return false;
    if (r.outliers.denied.includes(fw)) return false;
    if (r.outliers.accepted.includes(fw)) return true;
    return cmpVer(fw, r.min) >= 0 && cmpVer(fw, r.max) <= 0;
  });
}

function methodsFor(model, fw) {
  const rank = (j) => {
    const e = EASY_ORDER.indexOf(j.name);
    if (e >= 0) return e;
    return 10 + (j.registration ? 1 : 0) + (j.ads ? 2 : 0);
  };
  return JAILBREAKS.filter((j) => matches(j, model, fw)).sort((a, b) => rank(a) - rank(b));
}

const modelName = (id) => {
  const p = PICK.find((x) => x[0] === id);
  if (p) return `${p[1]} ${p[2]}`;
  const m = MODELS.find((x) => x.id === id);
  return m ? m.name.replace(/^Kindle /, "").replace(/ - (\d+) Release/, " $1") : id;
};

/* ---------- Rendering ---------- */

const app = document.getElementById("app");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const STEPS = ["kindle", "firmware", "unlock", "store", "apps"];

function dots(route) {
  const i = STEPS.indexOf(route);
  document.getElementById("dots").innerHTML = i < 0 ? "" :
    STEPS.map((_, j) => `<span class="${j === i ? "on" : j < i ? "done" : ""}"></span>`).join("");
}

function appTile(a) {
  return `<button class="tile app" data-focus data-app="${a.id}">
    <div class="icon" style="--g:${a.g}">${ICONS[a.icon]}${a.official ? `<span class="badge">${t("official")}</span>` : ""}</div>
    <div class="name">${a.name}</div><div class="sub">${L(a.sub)}</div>
  </button>`;
}

const pathInfo = () => `<span class="hint">${t("where")} <span class="path">${t("pathInfo").map((p) => `<b>${p}</b>`).join("›")}</span></span>`;
const nav = (backTo, nextTo, nextLabel, enabled = true) => `<div class="actions">
  ${backTo ? `<a class="btn" data-focus href="#/${backTo}">${t("back")}</a>` : ""}
  <button class="btn primary" data-focus id="next" data-go="${nextTo}" ${enabled ? "" : "disabled"}>${nextLabel || t("next")}</button></div>`;

const screens = {
  home() {
    return `<section class="screen">
      <div class="hero">
        <img class="hero-logo" src="/icon.svg" alt="" width="76" height="76">
        <p class="eyebrow">${t("heroKicker")}</p>
        <h1>${t("hero")}</h1>
        <p class="lead">${t("heroLead")}</p>
      </div>
      <div class="steps3">
        <a class="tile" data-focus href="#/kindle"><span class="n">1</span><div><div class="t">${t("s1")}</div><div class="d">${t("s1d")}</div></div></a>
        <a class="tile" data-focus href="#/unlock"><span class="n">2</span><div><div class="t">${t("s2")}</div><div class="d">${t("s2d")}</div></div></a>
        <a class="tile" data-focus href="#/store"><span class="n">3</span><div><div class="t">${t("s3")}</div><div class="d">${t("s3d")}</div></div></a>
      </div>
      <div class="actions"><a class="btn primary" data-focus href="#/kindle" id="start">${t("start")}</a></div>
      <div class="shelf-title"><h2>${t("appsTitle")}</h2><a href="#/apps" data-focus>${t("seeAll")} ›</a></div>
      <div class="apps">${APPS.slice(0, 10).map(appTile).join("")}</div>
      <p class="foot"><span>${t("foot")}</span></p>
    </section>`;
  },

  kindle() {
    return `<section class="screen">
      <p class="eyebrow">${t("step")} 1 ${t("of")} 5</p>
      <h1>${t("kindleQ")}</h1>
      <p class="lead">${t("kindleLead")}</p>
      <input class="field" id="serial" data-focus maxlength="8" placeholder="G000XX00" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(state.serial || "")}">
      <div class="found" id="found"></div>
      ${pathInfo()}
      <p class="or">${t("orPick")}</p>
      <div class="models">${PICK.map(([id, n, y]) => `<button class="tile${state.model === id ? " selected" : ""}" data-focus data-model="${id}"><b>${n}</b><span>${y}</span></button>`).join("")}</div>
      ${nav("", "firmware", "", !!state.model)}
    </section>`;
  },

  firmware() {
    return `<section class="screen">
      <p class="eyebrow">${t("step")} 2 ${t("of")} 5 · ${esc(modelName(state.model))}</p>
      <h1>${t("fwQ")}</h1>
      <p class="lead">${t("fwLead")}</p>
      <input class="field" id="fw" data-focus maxlength="16" placeholder="5.19.6" inputmode="decimal" autocomplete="off" value="${esc(state.fw || "")}">
      <div class="found" id="found"></div>
      ${pathInfo()}
      ${nav("kindle", "unlock", "", validFw(state.fw))}
    </section>`;
  },

  unlock() {
    if (!state.model) return screens.kindle();
    if (!validFw(state.fw)) return screens.firmware();
    const list = methodsFor(state.model, state.fw);
    const head = `<p class="eyebrow">${t("step")} 3 ${t("of")} 5 · ${esc(modelName(state.model))} · ${esc(state.fw)}</p>`;
    if (!list.length) {
      return `<section class="screen">${head}
        <div class="empty"><h2>${t("noneTitle")}</h2><p>${t("noneLead")}</p><ul class="list" style="margin-top:22px">
        <li><div><p>${t("noneTip1")}</p></div></li><li><div><p>${t("noneTip2")}</p></div></li></ul></div>
        <div class="actions"><a class="btn" data-focus href="#/firmware">${t("back")}</a></div></section>`;
    }
    const best = list[0];
    const easy = EASY[best.name];
    const guide = "https://kindlemodding.org" + best.url;
    const tags = [
      easy ? `<span class="tag good">${t("noPc")}</span>` : `<span class="tag warn">${t("needsUsb")}</span>`,
      best.registration ? `<span class="tag">${t("needsReg")}</span>` : "",
      best.ads ? `<span class="tag">${t("needsAds")}</span>` : "",
    ].join("");
    const others = list.slice(1).map((j) => `<a href="https://kindlemodding.org${j.url}" target="_blank" rel="noopener">${j.name}</a>`).join(", ");

    const steps = easy
      ? `<ol class="list">
          <li class="check"><div><p>${t("before")}</p></div></li>
          ${L(easy.steps).map(([a, b]) => `<li><div><p>${a}</p>${b === "url" ? `<span class="kbd big">${easy.url}</span>` : b ? `<small>${b}</small>` : ""}</div></li>`).join("")}
        </ol>`
      : `<div class="empty"><p>${t("usbLead")}</p>
          <details class="ai"><summary data-focus>${t("aiTitle")}</summary><p>${t("aiLead")}</p>
            <pre class="prompt" id="prompt">${esc(aiPrompt(best, guide))}</pre>
            <button class="btn primary" data-focus id="copy">${t("copy")}</button></details>
          <p>${t("orSelf")}</p><div class="actions"><a class="btn" data-focus href="${guide}" target="_blank" rel="noopener">${t("openGuide")} ↗</a></div></div>`;

    return `<section class="screen">${head}
      <div class="result">
        <div class="method">
          <div class="kicker">${t("unlockKicker")}</div>
          <h2>${best.name}</h2>
          <div class="tags">${tags}</div>
          <p class="alt"><a href="${guide}" target="_blank" rel="noopener">${t("openGuide")} ↗</a>${others ? `<br>${t("others")} ${others}` : ""}</p>
        </div>
        <div>${steps}</div>
      </div>
      ${nav("firmware", "store", t("jbDone"))}
    </section>`;
  },

  store() {
    const typed = `<div class="where2">
        <figure class="ok">${KINDLE_HOME}<figcaption>✓ ${t("homeOk")}</figcaption></figure>
        <figure class="no">${KINDLE_BROWSER}<figcaption>✗ ${t("browserNo")}</figcaption></figure>
      </div>
      <div class="cmds">
        <div class="cmd"><span class="n">1</span><div><p>${t("restartHint")}</p><b>${t("restart")}</b></div></div>
        <div class="cmd"><span class="n">2</span><div><p>${t("type")}</p><span class="kbd big">;kpm add-repo kindle.trinh.uk/r</span></div></div>
        <div class="cmd"><span class="n">3</span><div><p>${t("type")}</p><span class="kbd big">;kpm update</span></div></div>
        <div class="cmd"><span class="n">4</span><div><p>${t("check")}</p><span class="kbd big">;kpm install ku-http</span></div></div>
      </div>`;
    const pc = `<ol class="list">
          <li><div><p>${t("fb1")}</p><a class="btn" data-focus href="/ku-setup.sh" download>ku-setup.sh ↓</a></div></li>
          <li><div><p>${t("fb2")}</p></div></li>
          <li><div><p>${t("fb3")}</p></div></li>
        </ol>`;
    // Kindles unlocked over USB are older firmware, where the search bar
    // refuses any command containing a dot, so the repo can't be typed in.
    const usb = unlockedOverUsb();
    return `<section class="screen">
      <p class="eyebrow">${t("step")} 4 ${t("of")} 5</p>
      <h1>${t("storeQ")}</h1>
      ${usb
        ? `<p class="lead">${t("pcLead")}</p>${pc}
          <details class="ai fallback"><summary data-focus>${t("typeTitle")}</summary><p class="sub">${t("typeNote")}</p>${typed}</details>`
        : `<p class="lead">${t("storeLead")}</p>${typed}
          <details class="ai fallback"><summary data-focus>${t("fbTitle")}</summary>${pc}</details>`}
      ${nav(state.model ? "unlock" : "", "apps", t("storeDone"))}
    </section>`;
  },

  apps() {
    return `<section class="screen">
      <p class="eyebrow">${t("step")} 5 ${t("of")} 5</p>
      <h1>${t("appsQ")}</h1>
      <p class="lead">${t("appsLead")}</p>
      <div class="cmds">
        <div class="cmd"><span class="n">1</span><div><b>${t("ph1")}</b></div></div>
        <div class="cmd"><span class="n">2</span><div><b>${t("ph2")}</b></div></div>
        <div class="cmd"><span class="n">3</span><div><b>${t("ph3")}</b></div></div>
      </div>
      <p class="lead" style="margin-top:40px">${t("orManual")}</p>
      <div class="apps">${APPS.map(appTile).join("")}</div>
      <div class="actions"><a class="btn" data-focus href="#/store">${t("back")}</a></div>
    </section>`;
  },
};

function unlockedOverUsb() {
  if (!state.model || !validFw(state.fw)) return false;
  const best = methodsFor(state.model, state.fw)[0];
  return !!best && !EASY[best.name];
}

function aiPrompt(jb, guide) {
  const v = { name: `${modelName(state.model)} [${state.model}]`, fw: state.fw, method: jb.name, guide };
  return t("aiPrompt").replace(/\{(\w+)\}/g, (_, k) => v[k]);
}

function validFw(v) {
  return !!v && /^\d+(\.\d+){1,5}$/.test(v);
}

function route() {
  const r = location.hash.replace(/^#\/?/, "") || "home";
  return screens[r] ? r : "home";
}

function render() {
  const r = route();
  document.documentElement.lang = lang;
  document.getElementById("lang").innerHTML = LANGS.map(([k, n]) => `<button data-focus data-lang="${k}" class="${k === lang ? "on" : ""}">${n}</button>`).join("");
  app.innerHTML = screens[r]();
  dots(r);
  wire(r);
  const first = app.querySelector("input") || app.querySelector("#next:not([disabled])") || app.querySelector("#start");
  if (first && matchMedia("(pointer: fine)").matches) first.focus({ preventScroll: true });
}

function wire(r) {
  app.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => { if (b.dataset.go) location.hash = "#/" + b.dataset.go; }));
  app.querySelectorAll("[data-app]").forEach((b) => b.addEventListener("click", () => openApp(b.dataset.app)));

  if (r === "kindle") {
    const input = document.getElementById("serial");
    const found = document.getElementById("found");
    const next = document.getElementById("next");
    const show = () => {
      const v = input.value.trim();
      state.serial = v;
      if (v.length < 4) { found.innerHTML = ""; save(); return; }
      const m = modelFromSerial(v);
      if (m === null) { found.innerHTML = ""; return; }
      if (!m) { found.innerHTML = `<span class="chip bad">${t("badSerial")}</span>`; return; }
      state.model = m.id;
      save();
      found.innerHTML = `<span class="chip ok">${esc(modelName(m.id))}</span>`;
      next.disabled = false;
      app.querySelectorAll("[data-model]").forEach((x) => x.classList.toggle("selected", x.dataset.model === m.id));
    };
    input.addEventListener("input", show);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !next.disabled) next.click(); });
    if (input.value) show();
    app.querySelectorAll("[data-model]").forEach((b) => b.addEventListener("click", () => {
      state.model = b.dataset.model;
      save();
      location.hash = "#/firmware";
    }));
  }

  if (r === "unlock") {
    const copy = document.getElementById("copy");
    if (copy) copy.addEventListener("click", () => {
      const text = document.getElementById("prompt").textContent;
      const done = () => { copy.textContent = t("copied"); setTimeout(() => (copy.textContent = t("copy")), 2000); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => selectPrompt());
      else selectPrompt();
    });
  }

  if (r === "firmware") {
    const input = document.getElementById("fw");
    const found = document.getElementById("found");
    const next = document.getElementById("next");
    const show = () => {
      const v = input.value.trim().replace(/^v/i, "").replace(/[^\d.]/g, "");
      const ok = validFw(v);
      next.disabled = !ok;
      if (ok) { state.fw = v; save(); }
      found.innerHTML = !v || ok ? "" : `<span class="chip bad">${t("badFw")}</span>`;
    };
    input.addEventListener("input", show);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !next.disabled) next.click(); });
  }
}

function selectPrompt() {
  const r = document.createRange();
  r.selectNodeContents(document.getElementById("prompt"));
  getSelection().removeAllRanges();
  getSelection().addRange(r);
}

/* ---------- App sheet ---------- */

const sheet = document.getElementById("sheet");
const card = document.getElementById("sheet-card");
let lastFocus = null;

function openApp(id) {
  const a = APPS.find((x) => x.id === id);
  if (!a) return;
  lastFocus = document.activeElement;
  card.innerHTML = `
    <div class="icon" style="--g:${a.g}">${ICONS[a.icon]}</div>
    <div>
      <h2>${a.name}</h2>
      <p class="desc">${L(a.desc)}</p>
      ${a.mac ? `<ol class="list">
        <li><div><p>${t("mac1")}</p></div></li>
        <li><div><p>${t("mac2")}</p></div></li>
        <li><div><p>${t("mac3")}</p>
          <small>Mac · Terminal</small><span class="kbd">curl -fsSL kindle.trinh.uk/mirror.sh | bash</span>
          <small style="margin-top:12px">Windows · PowerShell</small><span class="kbd">irm kindle.trinh.uk/mirror.ps1 | iex</span></div></li>
      </ol>` : `<ol class="list">
        <li><div><p>${t("installType")}</p><span class="kbd">;kpm install ${a.id}</span></div></li>
        <li><div><p>${t("openIt")} <b>${a.name}</b>.</p></div></li>
        ${a.use ? `<li><div><p>${L(a.use)}</p></div></li>` : ""}
      </ol>`}
      ${a.note ? `<p class="note">${L(a.note)}</p>` : ""}
      ${a.official || a.mac ? "" : `<p class="note">${t("firstTime")}</p>`}
      <div class="actions">
        <button class="btn primary" data-focus data-close>${t("close")}</button>
        ${a.official ? "" : `<a class="btn" data-focus href="#/store" data-close>${t("connect")}</a>`}
      </div>
    </div>`;
  sheet.hidden = false;
  card.querySelector("[data-focus]").focus();
}

function closeSheet() {
  if (sheet.hidden) return;
  sheet.hidden = true;
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}
sheet.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeSheet(); });

/* ---------- tvOS-style focus + parallax ---------- */

function focusables() {
  const root = sheet.hidden ? document : card;
  return [...root.querySelectorAll("[data-focus]")].filter((el) => !el.disabled && el.offsetParent !== null);
}

function moveFocus(dir) {
  const items = focusables();
  const cur = document.activeElement;
  if (!items.includes(cur)) { items[0]?.focus(); return; }
  const c = cur.getBoundingClientRect();
  const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
  let best = null, bestScore = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const dx = x - cx, dy = y - cy;
    const along = { left: -dx, right: dx, up: -dy, down: dy }[dir];
    if (along <= 4) continue;
    const across = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
    const score = along + across * 2.5;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) {
    best.focus({ preventScroll: true });
    best.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

document.addEventListener("keydown", (e) => {
  const typing = e.target.tagName === "INPUT";
  const dir = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }[e.key];
  if (dir && !(typing && (dir === "left" || dir === "right"))) {
    e.preventDefault();
    moveFocus(dir);
  } else if (e.key === "Escape") {
    if (!sheet.hidden) closeSheet();
    else if (route() !== "home") history.back();
  }
});

document.addEventListener("pointermove", (e) => {
  const tile = e.target.closest?.(".tile");
  if (!tile) return;
  const r = tile.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
  tile.style.setProperty("--mx", px * 100 + "%");
  tile.style.setProperty("--my", py * 100 + "%");
  tile.style.setProperty("--ry", (px - .5) * 8 + "deg");
  tile.style.setProperty("--rx", (.5 - py) * 8 + "deg");
});
document.addEventListener("pointerout", (e) => {
  const tile = e.target.closest?.(".tile");
  if (tile && !tile.contains(e.relatedTarget)) {
    tile.style.setProperty("--rx", "0deg");
    tile.style.setProperty("--ry", "0deg");
  }
});

document.getElementById("lang").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lang]");
  if (!b || b.dataset.lang === lang) return;
  lang = b.dataset.lang;
  try { localStorage.setItem("ku.lang", lang); } catch (e) {}
  render();
});

window.addEventListener("hashchange", () => { closeSheet(); render(); window.scrollTo({ top: 0, behavior: "instant" }); });

/* ---------- Boot ---------- */

async function getJSON(urls) {
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (r.ok) return await r.json();
    } catch (e) {}
  }
  return [];
}

(async () => {
  [MODELS, JAILBREAKS] = await Promise.all([
    getJSON(["/data/models.json"]),
    getJSON(["/api/jailbreaks", "/data/jailbreaks.json"]),
  ]);
  render();
})();

// Works offline once loaded (sw.js).
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
