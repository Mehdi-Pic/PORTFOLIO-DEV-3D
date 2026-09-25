// Petites illustrations pixel art dessinées en code (44×44), affichées en polaroids
// dans les fiches Compétences et Loisirs. artURL(nom) → image data: URL (mise en cache).
const S = 44;
const cache = new Map();

export function artURL(name) {
  if (!cache.has(name)) {
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const d = painter(c.getContext("2d"));
    (ARTS[name] || ARTS.missing)(d);
    cache.set(name, c.toDataURL());
  }
  return cache.get(name);
}

function painter(g) {
  const W = g.canvas.width, H = g.canvas.height;
  const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const px = (x, y, col) => rect(Math.round(x), Math.round(y), 1, 1, col);
  const disc = (cx, cy, r, col) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.8) px(cx + x, cy + y, col);
  };
  const ring = (cx, cy, r, col, t = 1, keep = () => true) => {
    for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
      const d = Math.hypot(x, y);
      if (d <= r + 0.5 && d > r - t + 0.5 && keep(x, y)) px(cx + x, cy + y, col);
    }
  };
  const line = (x0, y0, x1, y1, col, t = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++) rect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), t, t, col);
  };
  const box = (x, y, w, h, col) => { rect(x, y, w, 1, col); rect(x, y + h - 1, w, 1, col); rect(x, y, 1, h, col); rect(x + w - 1, y, 1, h, col); };
  // fond en bandes horizontales (dégradé pixel art)
  const bands = (cols, y0 = 0, y1 = H) => {
    const hh = (y1 - y0) / cols.length;
    cols.forEach((c, i) => rect(0, Math.round(y0 + i * hh), W, Math.ceil(hh) + 1, c));
  };
  return { rect, px, disc, ring, line, box, bands };
}

// cylindre de base de données (couleurs : corps, dessus, ombre)
function database(d, body, top, dark, bg) {
  d.bands(bg);
  for (let k = 2; k >= 0; k--) {
    const y = 10 + k * 9;
    d.rect(11, y, 22, 9, body);
    for (let x = -11; x <= 11; x++) {
      const e = Math.round(3 * Math.sqrt(Math.max(0, 1 - (x * x) / 121)));
      d.rect(22 + x, y + 8, 1, e + 1, body); // fond arrondi
      d.px(22 + x, y + 8 + e, dark);
      if (k === 0) { d.rect(22 + x, y - e, 1, 2 * e + 1, top); d.px(22 + x, y - e, "#ffffff55"); }
    }
    d.rect(29, y + 3, 2, 1, "#9ef01a"); // petite LED
  }
}

function bubble(d, flag, tailLeft) {
  d.bands(["#dbe7ff", "#e7f0ff", "#f1f6ff"]);
  d.rect(5, 8, 34, 24, "#ffffff");
  d.box(5, 8, 34, 24, "#3d4a6b");
  // queue de la bulle : triangle blanc bordé, côté droit ou gauche
  const tx = tailLeft ? 10 : 28;
  for (let i = 0; i < 6; i++) {
    const w = 6 - i, x = tailLeft ? tx : tx + i;
    d.rect(x, 31 + i, w, 1, "#ffffff");
    d.px(x, 31 + i, "#3d4a6b");
    d.px(x + w - 1, 31 + i, "#3d4a6b");
  }
  flag(10, 13, 24, 14);
}

const ARTS = {
  missing(d) { d.bands(["#bbb", "#ccc"]); d.box(10, 10, 24, 24, "#888"); },

  // ---------------- Loisirs ----------------
  clap(d) {
    d.bands(["#5a0f1a", "#6e1422", "#82192b"]);
    for (let x = 1; x < S; x += 5) d.rect(x, 0, 1, S, "#4a0b15"); // plis du rideau
    d.rect(8, 20, 28, 18, "#1d1d24");
    d.rect(8, 20, 28, 1, "#3a3a46");
    [24, 28, 32].forEach((y, i) => d.rect(11, y, i === 2 ? 12 : 22, 1, "#e8e8e8"));
    d.rect(27, 31, 6, 4, "#e8e8e8");
    for (let i = 0; i < 28; i++) { // claquette entrouverte, rayée
      const y0 = 17 - Math.round(i * 0.32);
      for (let t = 0; t < 4; t++) d.px(8 + i, y0 + t, (i >> 2) % 2 ? "#f2f2f2" : "#1d1d24");
    }
    d.rect(8, 17, 3, 4, "#9a9aa6");
  },
  reel(d) {
    d.bands(["#141b33", "#1b2544", "#233057"]);
    d.disc(20, 19, 14, "#8d96aa");
    d.disc(20, 19, 12, "#b7bfd0");
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 - 1.2; d.disc(20 + Math.round(Math.cos(a) * 7), 19 + Math.round(Math.sin(a) * 7), 3, "#2a2f3d"); }
    d.disc(20, 19, 2, "#2a2f3d");
    d.rect(22, 32, 22, 9, "#2a2320"); // pellicule qui se déroule
    for (let x = 23; x < S; x += 3) { d.px(x, 33, "#d9c9a3"); d.px(x, 39, "#d9c9a3"); }
    for (let x = 24; x < S; x += 7) d.rect(x, 35, 5, 3, "#8a6f4d");
  },
  popcorn(d) {
    d.bands(["#241436", "#2e1a45", "#3a2157"]);
    d.disc(22, 6, 14, "#3f2a60"); // halo du projecteur
    for (let y = 22; y < 42; y++) {
      const half = Math.round(11 - (y - 22) * 0.18), l = 22 - half;
      for (let x = l; x < 22 + half; x++) d.px(x, y, ((x - l) >> 2) % 2 ? "#f4f1ea" : "#d62828");
    }
    const pts = [[14, 20], [18, 17], [23, 19], [28, 17], [31, 21], [20, 14], [26, 13], [12, 22], [22, 22], [16, 21], [29, 14]];
    pts.forEach(([x, y], i) => { d.disc(x, y, 2, ["#fff6d8", "#ffe9a8", "#fffdf4"][i % 3]); d.px(x + 1, y + 1, "#e6c36a"); });
  },
  bike(d) {
    d.bands(["#8ecae6", "#a9d8ee", "#c4e6f4"], 0, 32);
    d.rect(0, 32, S, 12, "#6aa84f"); d.rect(0, 32, S, 1, "#8cc063");
    d.disc(34, 8, 4, "#fff3b0");
    d.ring(11, 30, 7, "#222", 2); d.ring(33, 30, 7, "#222", 2);
    d.px(11, 30, "#999"); d.px(33, 30, "#999");
    const red = "#d62828";
    d.line(11, 30, 20, 30, red, 2); d.line(20, 30, 17, 19, red, 2); d.line(17, 19, 29, 19, red, 2);
    d.line(20, 30, 29, 19, red, 2); d.line(29, 19, 33, 30, red, 2); d.line(11, 30, 17, 19, red, 2);
    d.rect(14, 17, 6, 2, "#222"); d.line(29, 19, 28, 15, "#555"); d.rect(26, 14, 5, 2, "#222");
    d.disc(20, 30, 2, "#555");
  },
  road(d) {
    d.bands(["#ffb4a2", "#ffc8b0", "#ffddc8"], 0, 26);
    d.disc(31, 13, 6, "#fff1b5");
    for (let x = 0; x < S; x++) { const y = 22 + Math.round(3 * Math.sin(x / 6)); d.rect(x, y, 1, S - y, "#7fb069"); d.px(x, y, "#9cc98a"); }
    for (let y = 24; y < S; y++) {
      const half = Math.round((y - 24) * 0.9) + 1;
      d.rect(22 - half, y, 2 * half, 1, "#5a606b");
      if ((y >> 1) % 2 && y > 25) d.rect(22, y, 1 + (y > 34 ? 1 : 0), 1, "#ffffff");
    }
  },
  map(d) {
    d.rect(0, 0, S, S, "#efe0bd");
    [14, 29].forEach((x) => { d.rect(x, 0, 1, S, "#dccb9f"); d.rect(x + 1, 0, 1, S, "#f7ecd2"); });
    d.disc(9, 33, 6, "#b8d8a0"); d.disc(34, 30, 5, "#b8d8a0"); d.disc(26, 8, 4, "#b8d8a0");
    for (let x = 0; x < S; x++) d.rect(x, 18 + Math.round(3 * Math.sin(x / 5)), 1, 2, "#7fb8e0"); // rivière
    const path = [[6, 40], [10, 34], [16, 30], [22, 26], [20, 20], [24, 15], [30, 12], [34, 16]];
    for (let i = 0; i < path.length - 1; i++) {
      const [x0, y0] = path[i], [x1, y1] = path[i + 1];
      for (let t = 0; t <= 1; t += 0.2) if (Math.round(t * 5) % 2 === 0) d.rect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 2, 2, "#d62828");
    }
    d.disc(34, 9, 4, "#e63946"); d.disc(34, 9, 1, "#ffffff"); d.line(34, 13, 34, 17, "#9d1d27");
  },
  ball(d) {
    for (let y = 0; y < S; y += 6) { d.rect(0, y, S, 6, (y / 6) % 2 ? "#c98f4f" : "#bf8446"); d.rect(0, y, S, 1, "#a86f36"); }
    d.disc(24, 38, 11, "#00000033"); // ombre au sol
    d.disc(22, 21, 14, "#e8751a");
    d.disc(18, 16, 4, "#f59a4a");
    const inBall = (x, y) => Math.hypot(x - 22, y - 21) <= 13.5;
    for (let t = -14; t <= 14; t++) { if (inBall(22, 21 + t)) d.px(22, 21 + t, "#3a1d0b"); if (inBall(22 + t, 21)) d.px(22 + t, 21, "#3a1d0b"); }
    d.ring(7, 21, 12, "#3a1d0b", 1, (x, y) => inBall(7 + x, 21 + y));
    d.ring(37, 21, 12, "#3a1d0b", 1, (x, y) => inBall(37 + x, 21 + y));
  },
  hoop(d) {
    d.bands(["#243b5a", "#2b4162", "#385f8a"]);
    d.rect(21, 0, 2, 6, "#8a8f99");
    d.rect(7, 5, 30, 19, "#f4f4f4"); d.box(7, 5, 30, 19, "#c9c9c9");
    d.box(16, 12, 12, 9, "#d62828");
    for (let i = 0; i < 6; i++) d.line(14 + i * 3, 26, 17 + i * 2, 37, "#ffffff");
    [30, 34].forEach((y) => d.rect(16, y, 12, 1, "#e6e6e6"));
    d.rect(13, 24, 18, 2, "#e8751a");
    d.disc(35, 36, 5, "#e8751a"); d.line(35, 31, 35, 41, "#3a1d0b"); // ballon qui rebondit
  },
  court(d) {
    d.rect(0, 0, S, S, "#d9a066");
    for (let y = 0; y < S; y += 4) d.rect(0, y, S, 1, "#c98f55");
    const w = "#ffffff";
    d.box(2, 2, 40, 40, w); d.rect(22, 2, 1, 40, w);
    d.ring(22, 22, 6, w);
    d.box(2, 15, 9, 14, w); d.box(34, 15, 8, 14, w);
    d.ring(11, 22, 5, w, 1, (x) => x >= 0); d.ring(33, 22, 5, w, 1, (x) => x <= 0);
    d.disc(22, 22, 5, "#e07b39");
  },

  // ---------------- Compétences ----------------
  code(d) {
    d.rect(0, 0, S, S, "#1e1e2e");
    d.rect(0, 0, S, 6, "#34344f");
    ["#ff5f56", "#ffbd2e", "#27c93f"].forEach((c, i) => d.disc(4 + i * 5, 3, 1, c));
    const rows = [[0, [["#c792ea", 6], ["#82aaff", 10]]], [2, [["#89ddff", 5], ["#f78c6c", 8]]], [2, [["#c3e88d", 14]]], [4, [["#82aaff", 7], ["#ffcb6b", 9]]], [2, [["#697098", 16]]], [0, [["#c792ea", 4], ["#89ddff", 6]]], [2, [["#f78c6c", 12]]], [0, [["#89ddff", 3]]]];
    rows.forEach(([ind, toks], i) => {
      let x = 5 + ind * 2;
      d.rect(1, 9 + i * 4, 2, 1, "#4a4a66");
      toks.forEach(([c, w]) => { d.rect(x, 9 + i * 4, w, 2, c); x += w + 2; });
    });
    d.rect(31, 37, 1, 3, "#ffffff"); // curseur
  },
  atom(d) {
    d.rect(0, 0, S, S, "#20232a");
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3;
      for (let t = 0; t < Math.PI * 2; t += 0.015) {
        const x = 17 * Math.cos(t), y = 6.5 * Math.sin(t);
        d.px(22 + x * Math.cos(a) - y * Math.sin(a), 22 + x * Math.sin(a) + y * Math.cos(a), "#61dafb");
      }
    }
    d.disc(22, 22, 3, "#61dafb");
  },
  postgres(d) { database(d, "#336791", "#5b93cc", "#1f4466", ["#dfe8f3", "#e9f0f8"]); },
  sqlserver(d) { database(d, "#b3261e", "#e0584f", "#6e1511", ["#f6e3e1", "#fbeceb"]); },
  git(d) {
    d.rect(0, 0, S, S, "#1b1f24");
    d.line(3, 31, 41, 31, "#f05133", 2);
    d.line(12, 31, 16, 17, "#4fc3f7", 2); d.line(16, 17, 30, 17, "#4fc3f7", 2); d.line(30, 17, 34, 31, "#4fc3f7", 2);
    d.line(20, 17, 24, 8, "#a5d66f", 2); d.line(24, 8, 36, 8, "#a5d66f", 2);
    [[7, 31], [17, 31], [27, 31], [39, 31]].forEach(([x, y]) => { d.disc(x, y + 1, 3, "#f05133"); d.disc(x, y + 1, 1, "#1b1f24"); });
    [[21, 17], [28, 17]].forEach(([x, y]) => { d.disc(x, y + 1, 3, "#4fc3f7"); d.disc(x, y + 1, 1, "#1b1f24"); });
    d.disc(34, 9, 3, "#a5d66f"); d.disc(34, 9, 1, "#1b1f24");
  },
  containers(d) {
    d.bands(["#a8d4f5", "#bde0fe", "#d3ebff"], 0, 29);
    d.bands(["#2d6a9f", "#255a88", "#1d4b73"], 29, S);
    for (let x = 2; x < S; x += 7) d.rect(x, 33 + ((x / 7) % 2) * 4, 3, 1, "#6fa8d6");
    for (let y = 27; y < 33; y++) { const inset = y - 27; d.rect(5 + inset, y, 34 - 2 * inset, 1, "#1d3557"); }
    const boxes = [[7, 21, "#2496ed"], [15, 21, "#1d7bc4"], [23, 21, "#2496ed"], [31, 21, "#48a9f8"], [11, 15, "#48a9f8"], [19, 15, "#2496ed"], [27, 15, "#1d7bc4"], [15, 9, "#1d7bc4"]];
    boxes.forEach(([x, y, c]) => { d.rect(x, y, 8, 6, c); for (let i = 1; i < 8; i += 2) d.rect(x + i, y + 1, 1, 4, "#00000022"); d.box(x, y, 8, 6, "#0d4f8b"); });
  },
  rocket(d) {
    d.bands(["#0b132b", "#1c2541", "#3a506b"]);
    [[5, 6], [36, 4], [30, 14], [8, 20], [39, 24], [14, 3]].forEach(([x, y]) => d.px(x, y, "#ffffff"));
    for (let y = 4; y < 11; y++) { const half = Math.round((y - 4) * 0.45); d.rect(22 - half, y, 2 * half + 1, 1, "#d62828"); }
    d.rect(19, 11, 7, 17, "#f1f1f1"); d.rect(24, 11, 2, 17, "#cfd5de");
    d.disc(22, 17, 2, "#4fc3f7"); d.ring(22, 17, 3, "#8d99ae");
    for (let i = 0; i < 6; i++) { d.rect(18 - i, 22 + i, 1 + i, 1, "#d62828"); d.rect(26, 22 + i, 1 + i, 1, "#d62828"); }
    d.rect(20, 28, 5, 3, "#ffd166"); d.rect(21, 31, 3, 3, "#f77f00"); d.px(22, 34, "#f77f00");
    [[12, 40, 5], [20, 42, 6], [30, 40, 5], [36, 43, 4], [5, 43, 4]].forEach(([x, y, r]) => d.disc(x, y, r, "#e0e6ef"));
  },
  chart(d) {
    d.rect(0, 0, S, S, "#e9e7e4");
    d.rect(4, 4, 36, 36, "#ffffff"); d.box(4, 4, 36, 36, "#c8c6c4");
    d.rect(7, 7, 14, 2, "#3a3a3a"); d.rect(7, 10, 9, 1, "#a19f9d");
    const bars = [[9, 12], [15, 18], [21, 9], [27, 22], [33, 15]];
    bars.forEach(([x, hgt], i) => d.rect(x, 36 - hgt, 4, hgt, i % 2 ? "#e8b100" : "#f2c811"));
    d.rect(7, 36, 31, 1, "#605e5c");
    [[10, 27], [16, 21], [22, 24], [28, 14], [34, 18]].reduce((a, b) => { d.line(a[0], a[1], b[0], b[1], "#252423"); return b; });
  },
  pipeline(d) {
    d.bands(["#e7edf6", "#eef2f7"]);
    d.rect(3, 14, 9, 14, "#6c757d"); d.rect(3, 13, 9, 2, "#adb5bd"); d.rect(3, 20, 9, 1, "#495057"); // source
    d.disc(22, 21, 6, "#f4a261"); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; d.rect(22 + Math.round(Math.cos(a) * 7) - 1, 21 + Math.round(Math.sin(a) * 7) - 1, 2, 2, "#f4a261"); }
    d.disc(22, 21, 2, "#e7edf6");
    d.rect(32, 12, 10, 18, "#2a9d8f"); for (let y = 15; y < 29; y += 4) d.rect(34, y, 6, 2, "#8ad3c8"); // entrepôt
    const arrow = (x0, x1) => { d.rect(x0, 21, x1 - x0, 1, "#264653"); d.px(x1 - 1, 20, "#264653"); d.px(x1 - 1, 22, "#264653"); d.px(x1 - 2, 19, "#264653"); d.px(x1 - 2, 23, "#264653"); };
    arrow(12, 16); arrow(29, 32);
    d.rect(4, 34, 36, 2, "#264653"); d.rect(4, 38, 24, 2, "#9aa9b8");
  },
  headset(d) {
    d.bands(["#d7e3fc", "#e2eafc", "#edf2fb"]);
    d.ring(22, 23, 13, "#3d3d46", 3, (x, y) => y <= 0);
    d.rect(6, 21, 7, 12, "#44444f"); d.rect(31, 21, 7, 12, "#44444f");
    d.rect(8, 23, 3, 8, "#6c6c7a"); d.rect(33, 23, 3, 8, "#6c6c7a");
    d.line(10, 33, 14, 38, "#3d3d46", 2); d.line(14, 38, 21, 38, "#3d3d46", 2);
    d.disc(23, 38, 2, "#222228");
    d.disc(34, 9, 4, "#2a9d8f"); d.rect(33, 7, 2, 3, "#ffffff"); d.px(33, 11, "#ffffff"); d.px(34, 11, "#ffffff"); // point d'aide
  },
  server(d) {
    d.rect(0, 0, S, S, "#1a1d23");
    d.rect(10, 3, 24, 39, "#2b2f38"); d.box(10, 3, 24, 39, "#3e4452");
    for (let k = 0; k < 7; k++) {
      const y = 6 + k * 5;
      d.rect(12, y, 20, 4, "#3a3f4b");
      d.px(14, y + 1, k % 3 === 1 ? "#ffb703" : "#38d430");
      d.px(16, y + 1, "#38d430");
      for (let x = 20; x < 30; x += 2) d.rect(x, y + 1, 1, 2, "#23262e");
    }
  },
  shield(d) {
    d.bands(["#dff1e6", "#e9f5ec"]);
    for (let y = 5; y < 40; y++) {
      const half = y < 22 ? 14 : Math.round(14 - (y - 22) * 0.8);
      if (half > 0) { d.rect(22 - half, y, 2 * half, 1, "#1f7a6e"); if (half > 2) d.rect(22 - half + 2, y, 2 * half - 4, 1, y < 22 ? "#2a9d8f" : "#27907f"); }
    }
    d.rect(8, 5, 28, 2, "#1f7a6e");
    d.ring(22, 21, 4, "#f4d35e", 2, (x, y) => y <= 0);
    d.rect(17, 21, 11, 9, "#f4d35e"); d.rect(17, 29, 11, 1, "#c9a227");
    d.rect(22, 24, 1, 3, "#5c4a0a"); d.px(22, 23, "#5c4a0a");
  },
  kanban(d) {
    d.rect(0, 0, S, S, "#f7f7f2");
    ["#9aa0ac", "#f4a261", "#2a9d8f"].forEach((c, i) => { d.rect(2 + i * 14, 3, 12, 3, c); if (i) d.rect(1 + i * 14, 3, 1, 38, "#dcdcd2"); });
    const cards = [[2, 9, "#fff176"], [2, 17, "#f8bbd0"], [2, 25, "#fff176"], [16, 9, "#80deea"], [16, 17, "#fff176"], [30, 9, "#c5e1a5"], [30, 17, "#c5e1a5"], [30, 25, "#c5e1a5"], [30, 33, "#c5e1a5"]];
    cards.forEach(([x, y, c]) => { d.rect(x, y, 12, 6, c); d.rect(x + 2, y + 2, 7, 1, "#00000030"); d.rect(x + 1, y + 6, 11, 1, "#00000018"); });
  },
  sprint(d) {
    d.bands(["#fdf6e3", "#fbf0d6"]);
    d.ring(22, 22, 14, "#0a5ce8", 3, (x, y) => !(x > 2 && y < -2 && y > -14));
    for (let i = 0; i < 5; i++) d.rect(30 + i, 5 + i, 7 - 2 * i > 0 ? 7 - 2 * i : 1, 1, "#0a5ce8");
    d.rect(29, 4, 9, 2, "#0a5ce8");
    d.line(15, 22, 20, 27, "#2a9d8f", 2); d.line(20, 27, 29, 16, "#2a9d8f", 2);
  },
  fr(d) {
    bubble(d, (x, y, w, h) => { d.rect(x, y, w / 3, h, "#0055a4"); d.rect(x + w / 3, y, w / 3, h, "#ffffff"); d.rect(x + (2 * w) / 3, y, w / 3, h, "#ef4135"); d.box(x, y, w, h, "#3d4a6b"); }, true);
  },
  en(d) {
    bubble(d, (x, y, w, h) => {
      d.rect(x, y, w, h, "#012169");
      d.line(x, y, x + w - 1, y + h - 1, "#ffffff", 2); d.line(x, y + h - 2, x + w - 1, y, "#ffffff", 2);
      d.line(x, y, x + w - 1, y + h - 1, "#c8102e"); d.line(x, y + h - 1, x + w - 1, y, "#c8102e");
      d.rect(x + w / 2 - 2, y, 4, h, "#ffffff"); d.rect(x, y + h / 2 - 2, w, 4, "#ffffff");
      d.rect(x + w / 2 - 1, y, 2, h, "#c8102e"); d.rect(x, y + h / 2 - 1, w, 2, "#c8102e");
      d.box(x, y, w, h, "#3d4a6b");
    }, false);
  },
};
