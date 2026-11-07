/*
 * Poop Profit share cards.
 *
 * Draws every share card with the browser's own Canvas 2D API. No html-to-image,
 * no DOM template, no third-party script. Same pixels on every phone.
 *
 * Card types:   "session" (one poop), "period" (today / week / month / year / custom),
 *               "alltime" (lifetime report)
 * Formats:      "story" 1080x1920 (9:16, IG/FB Stories, Snapchat, texts)
 *               "post"  1080x1350 (4:5, IG/FB feed, X, Reddit)
 *
 * Usage:
 *   PPShareCards.configure({ basePath: "/", money: money, moneyUsd: moneyUsd });
 *   var data = PPShareCards.buildSessionData(session);
 *   PPShareCards.render(data, { format: "story" }).then(PPShareCards.toBlob).then(...)
 *
 * Sessions are the app's normalized session objects:
 *   { endedAtMs, durationSeconds, earnings, rating (0-5), tp_squares, tp_savings }
 */
(function (global) {
  "use strict";

  var FORMATS = {
    story: { w: 1080, h: 1920 },
    post: { w: 1080, h: 1350 }
  };

  var C = {
    bg0: "#040a17",
    bg1: "#0a1b3d",
    blue: "#3b9dff",
    cyan: "#79e2ff",
    green: "#36e58f",
    greenDeep: "#14a868",
    gold: "#f5c542",
    paper: "#f7f2e6",
    paperEdge: "#e6dcc6",
    ink: "#14213a",
    inkMuted: "#68748a",
    white: "#ffffff",
    text: "#eaf2ff",
    muted: "#9db3d6",
    stamp: "#17a35f"
  };

  var FONT = '"PP Jakarta", "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

  var config = {
    basePath: "",
    mascotSrc: "images/herman-card.webp",
    // Optional per-card Herman poses. Missing entries fall back to mascotSrc.
    // e.g. { session: "images/herman-stamp.webp", period: "images/herman-chart.webp", alltime: "images/herman-check.webp" }
    mascotByType: {},
    tpIconSrc: "TPSavingsIcon.png",
    fontFiles: {
      600: "fonts/plus-jakarta-sans-latin-600-normal.woff2",
      700: "fonts/plus-jakarta-sans-latin-700-normal.woff2",
      800: "fonts/plus-jakarta-sans-latin-800-normal.woff2"
    },
    money: function (n) { return "$" + (Number(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); },
    moneyUsd: null,
    moneyWhole: null
  };

  function configure(options) {
    Object.keys(options || {}).forEach(function (key) { config[key] = options[key]; });
  }

  function money(n) { return config.money(Math.max(0, Number(n) || 0)); }
  function moneyUsd(n) { return (config.moneyUsd || config.money)(Math.max(0, Number(n) || 0)); }
  function moneyWhole(n) {
    if (config.moneyWhole) return config.moneyWhole(Math.max(0, Number(n) || 0));
    return money(Math.round(Number(n) || 0)).replace(/[.,]00$/, "");
  }

  /* ------------------------------------------------------------------ */
  /* Assets                                                              */
  /* ------------------------------------------------------------------ */

  var assetsPromise = null;
  var images = {};

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.decoding = "async";
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); }; // a missing image never blocks the card
      img.src = config.basePath + src;
    });
  }

  function loadFonts() {
    if (typeof FontFace !== "function" || !document.fonts) return Promise.resolve();
    var loads = Object.keys(config.fontFiles).map(function (weight) {
      var face = new FontFace("PP Jakarta", "url(" + config.basePath + config.fontFiles[weight] + ")", { weight: String(weight) });
      return face.load().then(function (loaded) { document.fonts.add(loaded); }).catch(function () {});
    });
    return Promise.all(loads);
  }

  function preload() {
    if (assetsPromise) return assetsPromise;
    assetsPromise = Promise.all([
      loadFonts(),
      loadImage(config.mascotSrc).then(function (img) { images.mascot = img; }),
      Promise.all(Object.keys(config.mascotByType || {}).map(function (type) {
        return loadImage(config.mascotByType[type]).then(function (img) { if (img) images["mascot_" + type] = img; });
      })),
      loadImage(config.tpIconSrc).then(function (img) { images.tp = img; })
    ]);
    return assetsPromise;
  }

  /* ------------------------------------------------------------------ */
  /* Formatting                                                          */
  /* ------------------------------------------------------------------ */

  function fmtDuration(totalSeconds) {
    var s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) return h + "h " + m + "m";
    if (m > 0) return m + "m " + sec + "s";
    return sec + "s";
  }

  function fmtDate(ms, opts) {
    return new Date(ms).toLocaleDateString(undefined, opts || { month: "short", day: "numeric", year: "numeric" });
  }

  function fmtRange(startMs, endMs) {
    var a = new Date(startMs);
    var b = new Date(endMs);
    if (a.toDateString() === b.toDateString()) return fmtDate(startMs);
    var sameYear = a.getFullYear() === b.getFullYear();
    var left = fmtDate(startMs, sameYear ? { month: "short", day: "numeric" } : undefined);
    return left + " - " + fmtDate(endMs);
  }

  /* ------------------------------------------------------------------ */
  /* Data builders (pure: sessions in, card data out)                    */
  /* ------------------------------------------------------------------ */

  function num(v) { var n = Number(v); return Number.isFinite(n) ? n : 0; }

  function tpOf(session) {
    if (session.tp_squares === null || session.tp_squares === undefined) return null;
    var squares = Math.max(0, Math.floor(num(session.tp_squares)));
    return { squares: squares, savings: num(session.tp_savings) };
  }

  function sumTp(sessions) {
    var any = false;
    var squares = 0;
    var savings = 0;
    sessions.forEach(function (s) {
      var tp = tpOf(s);
      if (!tp) return;
      any = true;
      squares += tp.squares;
      savings += tp.savings;
    });
    return any ? { squares: squares, savings: savings } : null;
  }

  function dayKey(ms) { var d = new Date(ms); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }

  function bestDay(sessions) {
    var byDay = {};
    sessions.forEach(function (s) { var k = dayKey(s.endedAtMs); byDay[k] = (byDay[k] || 0) + num(s.earnings); });
    return Object.keys(byDay).reduce(function (max, k) { return Math.max(max, byDay[k]); }, 0);
  }

  function totals(sessions) {
    var earnings = 0;
    var seconds = 0;
    var longest = 0;
    var bestSession = 0;
    sessions.forEach(function (s) {
      earnings += num(s.earnings);
      seconds += num(s.durationSeconds);
      longest = Math.max(longest, num(s.durationSeconds));
      bestSession = Math.max(bestSession, num(s.earnings));
    });
    return {
      earnings: earnings,
      seconds: seconds,
      count: sessions.length,
      avg: sessions.length ? earnings / sessions.length : 0,
      longest: longest,
      bestSession: bestSession
    };
  }

  function buildSessionData(session) {
    return {
      type: "session",
      earnings: num(session.earnings),
      durationSeconds: num(session.durationSeconds),
      endedAtMs: session.endedAtMs || Date.now(),
      rating: Math.max(0, Math.min(5, Math.floor(num(session.rating)))),
      tp: tpOf(session)
    };
  }

  // kind: "today" | "week" | "month" | "year" | "custom"
  // startMs / endMs: the same bounds the Stats tab used to filter `sessions`.
  function buildPeriodData(sessions, kind, startMs, endMs) {
    var list = sessions.slice();
    var t = totals(list);
    var firstMs = list.reduce(function (m, s) { return Math.min(m, s.endedAtMs); }, Infinity);
    var lastMs = list.reduce(function (m, s) { return Math.max(m, s.endedAtMs); }, -Infinity);
    var start = Number.isFinite(startMs) ? startMs : (Number.isFinite(firstMs) ? firstMs : Date.now());
    var end = Number.isFinite(endMs) ? endMs : (Number.isFinite(lastMs) ? lastMs : Date.now());
    return {
      type: "period",
      kind: kind,
      startMs: start,
      endMs: end,
      earnings: t.earnings,
      sessions: t.count,
      durationSeconds: t.seconds,
      avgEarnings: t.avg,
      bestSessionEarnings: t.bestSession,
      bestDayEarnings: bestDay(list),
      tp: sumTp(list),
      bars: buildBars(list, kind, start, end)
    };
  }

  function buildBars(sessions, kind, startMs, endMs) {
    var DAY = 86400000;
    var bars = [];
    var start = new Date(startMs); start.setHours(0, 0, 0, 0);
    var end = new Date(endMs);
    // Calendar periods show the whole period so the chart reads as "a week" or "a month";
    // days that have not happened yet are drawn as faint placeholders.
    var nowMs = Date.now();
    if (kind === "week") { end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999); }
    if (kind === "month") { end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999); }
    if (kind === "year") { end = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999); }
    var spanDays = Math.max(1, Math.round((end - start) / DAY));

    if (kind === "today") {
      return sessions.slice().sort(function (a, b) { return a.endedAtMs - b.endedAtMs; }).slice(-12).map(function (s) {
        var d = new Date(s.endedAtMs);
        var h = d.getHours();
        var label = ((h % 12) || 12) + (h < 12 ? "a" : "p");
        return { label: label, value: num(s.earnings) };
      });
    }

    var bucket;
    if (kind === "year" || spanDays > 180) bucket = "month";
    else if (spanDays > 35) bucket = "week";
    else bucket = "day";

    var cursor = new Date(start);
    var guard = 0;
    while (cursor <= end && guard < 60) {
      guard += 1;
      var next = new Date(cursor);
      var label;
      if (bucket === "day") {
        next.setDate(next.getDate() + 1);
        label = spanDays <= 7
          ? cursor.toLocaleDateString(undefined, { weekday: "narrow" })
          : String(cursor.getDate());
      } else if (bucket === "week") {
        next.setDate(next.getDate() + 7);
        label = cursor.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
      } else {
        next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        label = cursor.toLocaleDateString(undefined, { month: "narrow" });
      }
      var lo = cursor.getTime();
      var hi = next.getTime();
      var value = sessions.reduce(function (sum, s) {
        return s.endedAtMs >= lo && s.endedAtMs < hi ? sum + num(s.earnings) : sum;
      }, 0);
      bars.push({ label: label, value: value, future: lo > nowMs });
      cursor = next;
    }
    return bars;
  }

  // projectedAnnual is passed in from the app so the card always matches the Stats tab.
  function buildAllTimeData(sessions, extras) {
    var t = totals(sessions);
    var firstMs = sessions.reduce(function (m, s) { return Math.min(m, s.endedAtMs); }, Infinity);
    var ex = extras || {};
    return {
      type: "alltime",
      earnings: t.earnings,
      sessions: t.count,
      durationSeconds: t.seconds,
      avgEarnings: t.avg,
      bestDayEarnings: bestDay(sessions),
      longestSeconds: t.longest,
      bestSessionEarnings: t.bestSession,
      tp: sumTp(sessions),
      sinceMs: Number.isFinite(firstMs) ? firstMs : Date.now(),
      projectedAnnual: num(ex.projectedAnnual)
    };
  }

  /* ------------------------------------------------------------------ */
  /* Herman's verdicts (edit freely, keep them cheerful, no "earn more") */
  /* ------------------------------------------------------------------ */

  var VERDICTS = {
    rating: {
      5: "A five-flush performance. I'm calling the board.",
      4: "Strong numbers. Shareholders are thrilled.",
      3: "Solid fundamentals. Steady as she goes.",
      2: "A modest quarter. We stay the course.",
      1: "Every empire has a rough session."
    },
    longSession: "Long-term investor. I respect the patience.",
    quickSession: "In and out. Very efficient capital.",
    period: {
      today: "Today's numbers are in. Magnificent.",
      week: "Another fine week on company time.",
      month: "A monthly report I'd frame.",
      year: "This is what legacy looks like.",
      custom: "I've reviewed the numbers. Outstanding."
    },
    alltime: "I personally approve this portfolio."
  };

  function verdictFor(data) {
    if (data.type === "session") {
      if (data.rating > 0) return VERDICTS.rating[data.rating];
      return data.durationSeconds >= 900 ? VERDICTS.longSession : VERDICTS.quickSession;
    }
    if (data.type === "period") return VERDICTS.period[data.kind] || VERDICTS.period.custom;
    return VERDICTS.alltime;
  }

  /* ------------------------------------------------------------------ */
  /* Drawing helpers                                                     */
  /* ------------------------------------------------------------------ */

  function font(ctx, weight, size) { ctx.font = weight + " " + size + "px " + FONT; }

  function rr(ctx, x, y, w, h, r) {
    var rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  // Largest font size (<= max) at which text fits maxWidth.
  function fitSize(ctx, text, weight, max, min, maxWidth) {
    var size = max;
    while (size > min) {
      font(ctx, weight, size);
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 4;
    }
    return min;
  }

  // Letter-spaced text without relying on ctx.letterSpacing (older Safari lacks it).
  function trackedWidth(ctx, text, tracking) {
    var w = 0;
    for (var i = 0; i < text.length; i++) w += ctx.measureText(text[i]).width + (i < text.length - 1 ? tracking : 0);
    return w;
  }

  function drawTracked(ctx, text, cx, y, tracking) {
    var w = trackedWidth(ctx, text, tracking);
    var x = cx - w / 2;
    ctx.textAlign = "left";
    for (var i = 0; i < text.length; i++) {
      ctx.fillText(text[i], x, y);
      x += ctx.measureText(text[i]).width + tracking;
    }
    ctx.textAlign = "center";
  }

  function drawBackground(ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, C.bg1);
    g.addColorStop(0.55, "#071431");
    g.addColorStop(1, C.bg0);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    glow(ctx, w * 0.15, h * 0.12, w * 0.75, "rgba(59,157,255,0.30)");
    glow(ctx, w * 0.9, h * 0.32, w * 0.6, "rgba(54,229,143,0.14)");
    glow(ctx, w * 0.5, h * 0.95, w * 0.8, "rgba(59,157,255,0.18)");

    // Faint ledger grid: reads as "financial document" without competing with content.
    ctx.save();
    ctx.strokeStyle = "rgba(121,226,255,0.05)";
    ctx.lineWidth = 2;
    for (var x = 0; x <= w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (var y = 0; y <= h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.restore();
  }

  function glow(ctx, x, y, r, color) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  // "PoopProfit" + ".com" pill, drawn as type so it is sharp at any size.
  function drawWordmark(ctx, cx, y, size) {
    font(ctx, 800, size);
    var a = "Poop";
    var b = "Profit";
    var wa = ctx.measureText(a).width;
    var wb = ctx.measureText(b).width;
    font(ctx, 700, size * 0.5);
    var dot = ".com";
    var wd = ctx.measureText(dot).width;
    var pillPadX = size * 0.2;
    var pillW = wd + pillPadX * 2;
    var gap = size * 0.16;
    var total = wa + wb + gap + pillW;
    var x = cx - total / 2;

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    font(ctx, 800, size);
    ctx.fillStyle = C.white;
    ctx.fillText(a, x, y);
    ctx.fillStyle = "#29b6ff";
    ctx.fillText(b, x + wa, y);

    var px = x + wa + wb + gap;
    var ph = size * 0.62;
    var py = y - size * 0.55;
    rr(ctx, px, py, pillW, ph, ph / 2);
    ctx.lineWidth = Math.max(3, size * 0.06);
    ctx.strokeStyle = C.gold;
    ctx.stroke();
    font(ctx, 700, size * 0.5);
    ctx.fillStyle = C.white;
    ctx.fillText(dot, px + pillPadX, py + ph * 0.72);
    ctx.textAlign = "center";
  }

  function drawEyebrow(ctx, text, cx, y, size) {
    font(ctx, 800, size);
    var tracking = size * 0.22;
    var w = trackedWidth(ctx, text, tracking);
    var padX = size * 1.1;
    var h = size * 2.2;
    rr(ctx, cx - w / 2 - padX, y - h / 2, w + padX * 2, h, h / 2);
    ctx.fillStyle = "rgba(59,157,255,0.14)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(121,226,255,0.45)";
    ctx.stroke();
    ctx.fillStyle = C.cyan;
    ctx.textBaseline = "middle";
    drawTracked(ctx, text, cx, y + 1, tracking);
    ctx.textBaseline = "alphabetic";
  }

  // The money number. Green, glowing, auto-shrinks for long currencies (KRW, IDR...).
  function drawAmount(ctx, text, cx, baselineY, maxSize, maxWidth) {
    var size = fitSize(ctx, text, 800, maxSize, 80, maxWidth);
    font(ctx, 800, size);
    ctx.textAlign = "center";
    ctx.save();
    ctx.shadowColor = "rgba(54,229,143,0.55)";
    ctx.shadowBlur = size * 0.28;
    var g = ctx.createLinearGradient(0, baselineY - size * 0.8, 0, baselineY);
    g.addColorStop(0, "#b9ffd9");
    g.addColorStop(0.55, C.green);
    g.addColorStop(1, "#1fc977");
    ctx.fillStyle = g;
    ctx.fillText(text, cx, baselineY);
    ctx.restore();
    return size;
  }

  function drawHeadline(ctx, lead, amountText, tail, cx, top, s) {
    // s: { lead, amount, tail, gap, maxWidth }
    ctx.textAlign = "center";
    ctx.fillStyle = C.white;
    font(ctx, 800, fitSize(ctx, lead, 800, s.lead, 40, s.maxWidth));
    var y = top + s.lead;
    ctx.fillText(lead, cx, y);
    var amountSize = fitSize(ctx, amountText, 800, s.amount, 80, s.maxWidth);
    y = y + s.gap + amountSize * 0.8;
    drawAmount(ctx, amountText, cx, y, amountSize, s.maxWidth);
    ctx.fillStyle = C.white;
    font(ctx, 800, s.tail);
    y += s.gap * 0.6 + s.tail;
    ctx.fillText(tail, cx, y);
    return y;
  }

  // Simple vector poop for the rating row. filled=false draws an outline.
  function drawPoop(ctx, cx, cy, size, filled) {
    var s = size / 100;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    var tiers = [
      { y: 26, rx: 46, ry: 20 },
      { y: 2, rx: 35, ry: 17 },
      { y: -20, rx: 23, ry: 14 }
    ];
    tiers.forEach(function (t) {
      ctx.beginPath();
      ctx.ellipse(0, t.y, t.rx, t.ry, 0, 0, Math.PI * 2);
      if (filled) {
        var g = ctx.createLinearGradient(0, t.y - t.ry, 0, t.y + t.ry);
        g.addColorStop(0, "#a8713f");
        g.addColorStop(1, "#6b4220");
        ctx.fillStyle = g;
        ctx.fill();
      }
    });
    ctx.beginPath();
    ctx.moveTo(-8, -32);
    ctx.quadraticCurveTo(4, -48, 14, -46);
    ctx.quadraticCurveTo(6, -38, 6, -30);
    ctx.closePath();
    if (filled) { ctx.fillStyle = "#8a5a2e"; ctx.fill(); }
    if (!filled) {
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(20,33,58,0.22)";
      tiers.forEach(function (t) { ctx.beginPath(); ctx.ellipse(0, t.y, t.rx, t.ry, 0, 0, Math.PI * 2); ctx.stroke(); });
    }
    ctx.restore();
  }

  function drawStamp(ctx, text, cx, cy, size, angleDeg) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleDeg * Math.PI / 180);
    font(ctx, 800, size);
    var tracking = size * 0.12;
    var w = trackedWidth(ctx, text, tracking);
    var padX = size * 0.55;
    var h = size * 1.7;
    ctx.globalAlpha = 0.86;
    ctx.strokeStyle = C.stamp;
    ctx.lineWidth = size * 0.1;
    rr(ctx, -w / 2 - padX, -h / 2, w + padX * 2, h, size * 0.25);
    ctx.stroke();
    ctx.lineWidth = size * 0.04;
    rr(ctx, -w / 2 - padX + size * 0.18, -h / 2 + size * 0.18, w + padX * 2 - size * 0.36, h - size * 0.36, size * 0.16);
    ctx.stroke();
    ctx.fillStyle = C.stamp;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    drawTracked(ctx, text, 0, size * 0.04, tracking);
    ctx.restore();
    ctx.textBaseline = "alphabetic";
  }

  var currentType = "session";

  function drawMascot(ctx, x, bottomY, height, flip) {
    var img = images["mascot_" + currentType] || images.mascot;
    if (!img) return null;
    var w = height * (img.naturalWidth / img.naturalHeight);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;
    if (flip) {
      ctx.translate(x + w, bottomY - height);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, height);
    } else {
      ctx.drawImage(img, x, bottomY - height, w, height);
    }
    ctx.restore();
    return { x: x, y: bottomY - height, w: w, h: height };
  }

  // Speech bubble with Herman's line; tail points toward (tailX, tailY).
  function drawBubble(ctx, text, x, y, maxW, size, tailX, tailY) {
    font(ctx, 700, size);
    var words = text.split(" ");
    var lines = [];
    var line = "";
    words.forEach(function (word) {
      var test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW - size * 1.6 && line) { lines.push(line); line = word; }
      else line = test;
    });
    if (line) lines.push(line);
    var lh = size * 1.22;
    var labelSize = size * 0.62;
    var padY = size * 0.8;
    var h = padY * 2 + labelSize * 1.5 + lines.length * lh;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    rr(ctx, x, y, maxW, h, size * 0.9);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.restore();
    // tail: short and pointed at Herman, never a long spear across the card
    tailY = Math.min(tailY, y + h + size * 1.8);
    tailX = Math.min(Math.max(tailX, x + size * 2), x + maxW + size * 2.5);
    ctx.beginPath();
    var baseX = Math.min(Math.max(tailX, x + size * 2), x + maxW - size * 2);
    ctx.moveTo(baseX - size * 0.7, y + h - 2);
    ctx.lineTo(tailX, tailY);
    ctx.lineTo(baseX + size * 0.7, y + h - 2);
    ctx.closePath();
    ctx.fillStyle = C.white;
    ctx.fill();

    ctx.textAlign = "left";
    font(ctx, 800, labelSize);
    ctx.fillStyle = C.blue;
    ctx.fillText("HERMAN'S VERDICT", x + size * 0.8, y + padY + labelSize);
    font(ctx, 700, size);
    ctx.fillStyle = C.ink;
    lines.forEach(function (l, i) {
      ctx.fillText(l, x + size * 0.8, y + padY + labelSize * 1.5 + lh * (i + 0.85));
    });
    ctx.textAlign = "center";
    return h;
  }

  function drawCta(ctx, x, y, w, h) {
    var g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "#1f6fe0");
    g.addColorStop(1, "#2f9dff");
    rr(ctx, x, y, w, h, h * 0.32);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(185,235,255,0.55)";
    ctx.stroke();

    // URL pill on the right first, so the headline knows how much room it has.
    var pillSize = h * 0.26;
    font(ctx, 800, pillSize);
    var url = "PoopProfit.com";
    var pw = ctx.measureText(url).width + pillSize * 1.3;
    var ph = h * 0.5;
    var px = x + w - pw - h * 0.24;
    var py = y + (h - ph) / 2;
    rr(ctx, px, py, pw, ph, ph / 2);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.fillStyle = "#0b3b86";
    ctx.textAlign = "center";
    ctx.fillText(url, px + pw / 2, py + ph * 0.66);

    var left = x + h * 0.34;
    var room = px - left - h * 0.2;
    var head = "What do you make to poop?";
    var size = fitSize(ctx, head, 800, Math.round(h * 0.3), 20, room);
    ctx.textAlign = "left";
    font(ctx, 800, size);
    ctx.fillStyle = C.white;
    ctx.fillText(head, left, y + h * 0.48);
    var sub = "Free. Anonymous. Takes 5 seconds.";
    font(ctx, 600, fitSize(ctx, sub, 600, Math.round(size * 0.62), 14, room));
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(sub, left, y + h * 0.78);
    ctx.textAlign = "center";
  }

  // A stat tile: small label on top, big value below.
  function drawTile(ctx, x, y, w, h, label, value, accent) {
    rr(ctx, x, y, w, h, 28);
    ctx.fillStyle = "rgba(10,24,54,0.78)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(121,226,255,0.22)";
    ctx.stroke();
    ctx.textAlign = "left";
    font(ctx, 700, Math.round(h * 0.17));
    ctx.fillStyle = C.muted;
    ctx.fillText(label.toUpperCase(), x + 30, y + h * 0.36);
    var size = fitSize(ctx, value, 800, Math.round(h * 0.36), 24, w - 60);
    font(ctx, 800, size);
    ctx.fillStyle = accent || C.white;
    ctx.fillText(value, x + 30, y + h * 0.78);
    ctx.textAlign = "center";
  }

  function drawTiles(ctx, tiles, x, y, w, cols, tileH, gap) {
    var tileW = (w - gap * (cols - 1)) / cols;
    tiles.forEach(function (t, i) {
      var c = i % cols;
      var r = Math.floor(i / cols);
      drawTile(ctx, x + c * (tileW + gap), y + r * (tileH + gap), tileW, tileH, t[0], t[1], t[2]);
    });
    return y + Math.ceil(tiles.length / cols) * (tileH + gap) - gap;
  }

  function drawBarChart(ctx, bars, x, y, w, h, title) {
    rr(ctx, x, y, w, h, 32);
    ctx.fillStyle = "rgba(10,24,54,0.78)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(121,226,255,0.22)";
    ctx.stroke();

    var pad = 36;
    ctx.textAlign = "left";
    font(ctx, 700, 26);
    ctx.fillStyle = C.muted;
    ctx.fillText(title.toUpperCase(), x + pad, y + pad + 20);

    var max = bars.reduce(function (m, b) { return Math.max(m, b.value); }, 0);
    if (!bars.length || max <= 0) {
      ctx.textAlign = "center";
      font(ctx, 700, 34);
      ctx.fillStyle = C.muted;
      ctx.fillText("Quiet on the throne so far.", x + w / 2, y + h / 2 + 20);
      return;
    }
    var bestIndex = -1;
    bars.forEach(function (b, i) { if (max > 0 && b.value === max && bestIndex === -1) bestIndex = i; });

    var chartTop = y + pad + 90;
    var chartBottom = y + h - pad - 44;
    var chartH = chartBottom - chartTop;
    var n = Math.max(1, bars.length);
    var slot = (w - pad * 2) / n;
    var barW = Math.max(6, Math.min(70, slot * 0.62));
    var labelEvery = n > 16 ? Math.ceil(n / 8) : 1;

    // baseline
    ctx.strokeStyle = "rgba(157,179,214,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + pad, chartBottom + 1);
    ctx.lineTo(x + w - pad, chartBottom + 1);
    ctx.stroke();

    bars.forEach(function (b, i) {
      var cx = x + pad + slot * i + slot / 2;
      var bh = max > 0 ? Math.max(b.value > 0 ? 10 : 4, (b.value / max) * chartH) : 4;
      var isBest = i === bestIndex;
      rr(ctx, cx - barW / 2, chartBottom - bh, barW, bh, Math.min(14, barW / 2));
      if (isBest) {
        var g = ctx.createLinearGradient(0, chartBottom - bh, 0, chartBottom);
        g.addColorStop(0, "#9dffcb");
        g.addColorStop(1, C.greenDeep);
        ctx.fillStyle = g;
      } else if (b.future) {
        ctx.fillStyle = "rgba(157,179,214,0.08)";
      } else {
        ctx.fillStyle = b.value > 0 ? "rgba(59,157,255,0.85)" : "rgba(157,179,214,0.2)";
      }
      if (b.future) {
        rr(ctx, cx - barW / 2, chartBottom - chartH * 0.18, barW, chartH * 0.18, Math.min(14, barW / 2));
        ctx.fill();
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(157,179,214,0.25)";
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fill();
      }
      if (isBest) {
        ctx.textAlign = "center";
        font(ctx, 800, 28);
        ctx.fillStyle = C.green;
        var label = money(b.value);
        var lx = Math.min(Math.max(cx, x + pad + 60), x + w - pad - 60);
        ctx.fillText(label, lx, chartBottom - bh - 16);
      }
      if (i % labelEvery === 0) {
        ctx.textAlign = "center";
        font(ctx, 700, 24);
        ctx.fillStyle = isBest ? C.green : (b.future ? "rgba(157,179,214,0.45)" : C.muted);
        ctx.fillText(b.label, cx, chartBottom + 36);
      }
    });
    ctx.textAlign = "center";
  }

  /* ------------------------------------------------------------------ */
  /* Card: single session ("pay stub")                                   */
  /* ------------------------------------------------------------------ */

  function receiptRows(data) {
    var rows = [];
    rows.push({ label: "Time on the throne", value: fmtDuration(data.durationSeconds) });
    if (data.rating > 0) rows.push({ label: "Poop rating", rating: data.rating });
    if (data.tp) {
      rows.push({
        label: "Company TP saved",
        value: moneyUsd(data.tp.savings) + "  (" + data.tp.squares + " sq)"
      });
    }
    return rows;
  }

  function drawReceipt(ctx, data, x, y, w, rowH, size) {
    var rows = receiptRows(data);
    var headerH = size * 2.6;
    var totalH = size * 3.2;
    var stampH = size * 3.6; // empty zone at the bottom where the PAID stamp lands
    var h = headerH + rows.length * rowH + totalH + stampH;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 24;
    // paper with a zigzag (torn) bottom edge
    var tooth = size * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y + 16);
    ctx.arcTo(x, y, x + 16, y, 16);
    ctx.lineTo(x + w - 16, y);
    ctx.arcTo(x + w, y, x + w, y + 16, 16);
    ctx.lineTo(x + w, y + h);
    var teeth = Math.round(w / tooth);
    var tw = w / teeth;
    for (var i = teeth; i > 0; i--) {
      ctx.lineTo(x + (i - 0.5) * tw, y + h + tooth * 0.45);
      ctx.lineTo(x + (i - 1) * tw, y + h);
    }
    ctx.closePath();
    ctx.fillStyle = C.paper;
    ctx.fill();
    ctx.restore();

    var pad = size * 1.1;
    // header
    ctx.textAlign = "left";
    font(ctx, 800, size * 0.72);
    ctx.fillStyle = C.ink;
    drawTrackedLeft(ctx, "PAY STUB", x + pad, y + headerH * 0.55, size * 0.16);
    font(ctx, 600, size * 0.62);
    ctx.fillStyle = C.inkMuted;
    ctx.fillText("Bathroom Division", x + pad, y + headerH * 0.86);
    ctx.textAlign = "right";
    font(ctx, 700, size * 0.68);
    ctx.fillStyle = C.inkMuted;
    ctx.fillText(fmtDate(data.endedAtMs), x + w - pad, y + headerH * 0.62);

    dashed(ctx, x + pad, y + headerH + 4, x + w - pad, C.paperEdge);

    rows.forEach(function (row, i) {
      var ry = y + headerH + rowH * i + rowH * 0.64;
      ctx.textAlign = "left";
      font(ctx, 600, size * 0.82);
      ctx.fillStyle = C.inkMuted;
      ctx.fillText(row.label, x + pad, ry);
      if (row.rating) {
        var icon = size * 1.05;
        for (var k = 0; k < 5; k++) {
          drawPoop(ctx, x + w - pad - icon * 0.5 - (4 - k) * icon * 1.08, ry - icon * 0.3, icon, k < row.rating);
        }
      } else {
        ctx.textAlign = "right";
        font(ctx, 800, size * 0.9);
        ctx.fillStyle = C.ink;
        ctx.fillText(row.value, x + w - pad, ry);
      }
    });

    var ty = y + headerH + rows.length * rowH;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + pad, ty + 8);
    ctx.lineTo(x + w - pad, ty + 8);
    ctx.stroke();

    ctx.textAlign = "left";
    font(ctx, 800, size * 0.62);
    ctx.fillStyle = C.ink;
    drawTrackedLeft(ctx, "EARNED ON", x + pad, ty + totalH * 0.46, size * 0.08);
    drawTrackedLeft(ctx, "COMPANY TIME", x + pad, ty + totalH * 0.72, size * 0.08);
    ctx.textAlign = "right";
    var amt = money(data.earnings);
    var tsize = fitSize(ctx, amt, 800, Math.round(size * 1.6), 30, w * 0.5);
    font(ctx, 800, tsize);
    ctx.fillStyle = C.greenDeep;
    ctx.fillText(amt, x + w - pad, ty + totalH * 0.72);
    ctx.textAlign = "center";
    return {
      bottom: y + h + tooth * 0.45,
      stampCx: x + pad + size * 4.6,
      stampCy: ty + totalH + stampH * 0.48
    };
  }

  function drawTrackedLeft(ctx, text, x, y, tracking) {
    ctx.textAlign = "left";
    for (var i = 0; i < text.length; i++) {
      ctx.fillText(text[i], x, y);
      x += ctx.measureText(text[i]).width + tracking;
    }
  }

  function dashed(ctx, x1, y, x2, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.restore();
  }

  function tilt(ctx, cx, deg) {
    ctx.translate(cx, 0);
    ctx.rotate(deg * Math.PI / 180);
    ctx.translate(-cx, 0);
  }

  function drawSessionCard(ctx, data, f) {
    var W = f.w;
    var story = f.h > 1500;
    drawBackground(ctx, W, f.h);
    drawWordmark(ctx, W / 2, story ? 136 : 92, story ? 72 : 56);
    if (story) drawEyebrow(ctx, "OFFICIAL EARNINGS STATEMENT", W / 2, 232, 26);

    var headBottom = drawHeadline(ctx, "I got paid", money(data.earnings), "to poop.", W / 2, story ? 284 : 120, {
      lead: story ? 84 : 64, amount: story ? 224 : 168, tail: story ? 84 : 64, gap: story ? 28 : 18, maxWidth: W - 140
    });

    var ctaH = story ? 150 : 124;
    var ctaY = f.h - ctaH - (story ? 60 : 44);

    if (story) {
      ctx.save();
      tilt(ctx, W / 2, -1.6);
      var r = drawReceipt(ctx, data, 100, headBottom + 64, W - 200, 92, 38);
      drawStamp(ctx, "PAID IN FULL", r.stampCx, r.stampCy, 44, -9);
      ctx.restore();

      var mH = Math.max(380, Math.min(480, ctaY + 34 - (r.bottom - 120)));
      var m = drawMascot(ctx, W - 40 - mH * 0.98, ctaY + 34, mH, false);
      var bubbleTop = r.bottom + 34;
      var bubbleRoom = ctaY - 40 - bubbleTop;
      if (bubbleRoom > 150) {
        drawBubble(ctx, verdictFor(data), 56, bubbleTop, 560, 36, m ? m.x + m.w * 0.12 : W - 320, m ? m.y + m.h * 0.42 : ctaY - 90);
      }
    } else {
      ctx.save();
      tilt(ctx, 380, -1.6);
      var r2 = drawReceipt(ctx, data, 56, headBottom + 42, 660, 74, 29);
      drawStamp(ctx, "PAID", r2.stampCx - 20, r2.stampCy, 40, -9);
      ctx.restore();
      drawMascot(ctx, W - 360, ctaY + 30, 380, false);
    }
    drawCta(ctx, 50, ctaY, W - 100, ctaH);
  }

  /* ------------------------------------------------------------------ */
  /* Card: period (today / week / month / year / custom)                 */
  /* ------------------------------------------------------------------ */

  var PERIOD_COPY = {
    today: { eyebrow: "DAILY EARNINGS REPORT", lead: "Today I got paid", chart: "Each session" },
    week: { eyebrow: "WEEKLY EARNINGS REPORT", lead: "This week I got paid", chart: "Daily earnings" },
    month: { eyebrow: "MONTHLY EARNINGS REPORT", lead: "This month I got paid", chart: "Daily earnings" },
    year: { eyebrow: "ANNUAL EARNINGS REPORT", lead: "This year I got paid", chart: "Monthly earnings" },
    custom: { eyebrow: "EARNINGS REPORT", lead: "I got paid", chart: "Earnings over time" }
  };

  function periodTiles(data, max) {
    var tiles = [
      ["Sessions", String(data.sessions)],
      ["Throne time", fmtDuration(data.durationSeconds)],
      ["Avg / poop", money(data.avgEarnings)]
    ];
    if (data.tp) tiles.push(["TP saved", moneyUsd(data.tp.savings), C.cyan]);
    tiles.push(["Best poop", money(data.bestSessionEarnings), C.green]);
    return tiles.slice(0, max);
  }

  function drawPeriodCard(ctx, data, f) {
    var W = f.w;
    var story = f.h > 1500;
    var copy = PERIOD_COPY[data.kind] || PERIOD_COPY.custom;
    drawBackground(ctx, W, f.h);
    drawWordmark(ctx, W / 2, story ? 136 : 88, story ? 72 : 54);
    drawEyebrow(ctx, copy.eyebrow, W / 2, story ? 232 : 152, story ? 26 : 21);

    ctx.textAlign = "center";
    font(ctx, 700, story ? 34 : 27);
    ctx.fillStyle = C.muted;
    ctx.fillText(fmtRange(data.startMs, data.endMs), W / 2, story ? 312 : 212);

    var headBottom = drawHeadline(ctx, copy.lead, money(data.earnings), "to poop.", W / 2, story ? 330 : 224, {
      lead: story ? 78 : 56, amount: story ? 210 : 146, tail: story ? 78 : 56, gap: story ? 26 : 14, maxWidth: W - 140
    });

    var ctaH = story ? 150 : 124;
    var ctaY = f.h - ctaH - (story ? 60 : 44);

    if (story) {
      var chartY = headBottom + 50;
      drawBarChart(ctx, data.bars, 60, chartY, W - 120, 340, copy.chart);
      var tilesBottom = drawTiles(ctx, periodTiles(data, 4), 60, chartY + 364, W - 120, 4, 136, 16);
      var mH = Math.min(440, ctaY + 34 - tilesBottom - 20);
      var m = drawMascot(ctx, W - 40 - mH * 0.98, ctaY + 34, mH, false);
      var bubbleTop = tilesBottom + 36;
      if (ctaY - 40 - bubbleTop > 150) {
        drawBubble(ctx, verdictFor(data), 56, bubbleTop, 560, 34, m ? m.x + m.w * 0.12 : W - 320, m ? m.y + m.h * 0.42 : ctaY - 90);
      }
    } else {
      var cy = headBottom + 32;
      drawBarChart(ctx, data.bars, 50, cy, 650, ctaY - cy - 28, copy.chart);
      drawTiles(ctx, periodTiles(data, 3), 722, cy, W - 772, 1, 122, 16);
      drawMascot(ctx, W - 300, ctaY + 30, 290, false);
    }
    drawCta(ctx, 50, ctaY, W - 100, ctaH);
  }

  /* ------------------------------------------------------------------ */
  /* Card: all-time ("shareholder report")                               */
  /* ------------------------------------------------------------------ */

  function allTimeTiles(data, max) {
    var tiles = [
      ["Throne time", fmtDuration(data.durationSeconds)],
      ["Sessions", String(data.sessions)],
      ["Avg / poop", money(data.avgEarnings)],
      ["Best day", money(data.bestDayEarnings), C.green],
      ["Longest", fmtDuration(data.longestSeconds)]
    ];
    if (data.tp) tiles.push(["TP saved", moneyUsd(data.tp.savings), C.cyan]);
    else tiles.push(["Best poop", money(data.bestSessionEarnings), C.green]);
    return tiles.slice(0, max);
  }

  function drawPacePill(ctx, text, cx, y, size) {
    font(ctx, 800, size);
    var w = ctx.measureText(text).width + size * 1.6;
    var h = size * 2;
    rr(ctx, cx - w / 2, y, w, h, h / 2);
    ctx.fillStyle = "rgba(245,197,66,0.14)";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.gold;
    ctx.stroke();
    ctx.fillStyle = C.gold;
    ctx.textAlign = "center";
    ctx.fillText(text, cx, y + h * 0.68);
    return y + h;
  }

  function drawAllTimeCard(ctx, data, f) {
    var W = f.w;
    var story = f.h > 1500;
    drawBackground(ctx, W, f.h);
    drawWordmark(ctx, W / 2, story ? 136 : 88, story ? 72 : 54);
    drawEyebrow(ctx, "LIFETIME SHAREHOLDER REPORT", W / 2, story ? 232 : 152, story ? 26 : 21);

    var headBottom = drawHeadline(ctx, "I've been paid", money(data.earnings), "to poop.", W / 2, story ? 280 : 176, {
      lead: story ? 84 : 60, amount: story ? 224 : 156, tail: story ? 84 : 60, gap: story ? 28 : 16, maxWidth: W - 140
    });

    ctx.textAlign = "center";
    font(ctx, 700, story ? 34 : 27);
    ctx.fillStyle = C.muted;
    var sub = "Since " + fmtDate(data.sinceMs, { month: "short", year: "numeric" }) + "  ·  " +
      data.sessions + (data.sessions === 1 ? " session" : " sessions");
    var subY = headBottom + (story ? 60 : 44);
    ctx.fillText(sub, W / 2, subY);

    var y = subY + (story ? 30 : 20);
    if (data.projectedAnnual > 0) {
      y = drawPacePill(ctx, "On pace for " + moneyWhole(data.projectedAnnual) + " a year", W / 2, y, story ? 32 : 26);
    }

    var ctaH = story ? 150 : 124;
    var ctaY = f.h - ctaH - (story ? 60 : 44);

    if (story) {
      var tilesBottom = drawTiles(ctx, allTimeTiles(data, 6), 60, y + 44, W - 120, 3, 140, 16);
      var mH = Math.min(470, ctaY + 34 - tilesBottom - 20);
      var m = drawMascot(ctx, W - 40 - mH * 0.98, ctaY + 34, mH, false);
      var bubbleTop = tilesBottom + 40;
      if (ctaY - 40 - bubbleTop > 150) {
        drawBubble(ctx, verdictFor(data), 56, bubbleTop, 540, 36, m ? m.x + m.w * 0.12 : W - 320, m ? m.y + m.h * 0.42 : ctaY - 90);
      }
    } else {
      var tb = drawTiles(ctx, allTimeTiles(data, 6), 50, y + 30, W - 100, 3, 118, 14);
      var mh = Math.min(360, ctaY + 30 - tb - 16);
      var pm = drawMascot(ctx, W - 40 - mh * 0.98, ctaY + 30, mh, false);
      if (ctaY - 30 - (tb + 30) > 130) {
        drawBubble(ctx, verdictFor(data), 50, tb + 34, 560, 30, pm ? pm.x + pm.w * 0.12 : W - 300, pm ? pm.y + pm.h * 0.42 : ctaY - 60);
      }
    }
    drawCta(ctx, 50, ctaY, W - 100, ctaH);
  }


  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */

  function render(data, options) {
    var opts = options || {};
    var f = FORMATS[opts.format] || FORMATS.story;
    return preload().then(function () {
      var canvas = opts.canvas || document.createElement("canvas");
      canvas.width = f.w;
      canvas.height = f.h;
      var ctx = canvas.getContext("2d");
      ctx.textBaseline = "alphabetic";
      currentType = data.type;
      if (data.type === "session") drawSessionCard(ctx, data, f);
      else if (data.type === "period") drawPeriodCard(ctx, data, f);
      else drawAllTimeCard(ctx, data, f);
      return canvas;
    });
  }

  function toBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob); else reject(new Error("Share card PNG encode failed."));
      }, "image/png");
    });
  }

  function captionFor(data) {
    var url = "poopprofit.com";
    if (data.type === "session") return "I got paid " + money(data.earnings) + " to poop. What do you make? " + url;
    if (data.type === "alltime") {
      return "I've been paid " + money(data.earnings) + " to poop across " + data.sessions +
        (data.sessions === 1 ? " session" : " sessions") + ". What do you make? " + url;
    }
    var lead = { today: "Today", week: "This week", month: "This month", year: "This year" }[data.kind];
    return (lead ? lead + " I" : "I") + " got paid " + money(data.earnings) + " to poop. What do you make? " + url;
  }

  function fileNameFor(data, format) {
    var stamp = (Number(data.earnings) || 0).toFixed(2).replace(".", "-");
    var kind = data.type === "period" ? data.kind : data.type;
    return "poopprofit-" + kind + "-" + stamp + (format === "post" ? "-post" : "") + ".png";
  }

  global.PPShareCards = {
    FORMATS: FORMATS,
    VERDICTS: VERDICTS,
    configure: configure,
    preload: preload,
    buildSessionData: buildSessionData,
    buildPeriodData: buildPeriodData,
    buildAllTimeData: buildAllTimeData,
    render: render,
    toBlob: toBlob,
    captionFor: captionFor,
    fileNameFor: fileNameFor
  };
})(window);
