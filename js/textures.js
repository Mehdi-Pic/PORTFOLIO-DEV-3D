// Textures pixel art générées à la volée (canvas → texture Three.js).
import * as THREE from "three";
import { iconURL } from "./icons.js";

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function rng(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// flipY = false pour les UV exportées depuis Blender (glTF)
export function toTexture(c, { repeat = false, flipY = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = flipY;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const px = (ctx, x, y, col, w = 1, h = 1) => {
  ctx.fillStyle = col;
  ctx.fillRect(x, y, w, h);
};

export function floorTex() {
  const [c, ctx] = canvas(32, 32);
  const r = rng(7);
  // lames aux teintes proches, joints discrets et peu de veinage : un parquet calme
  const cols = ["#87583a", "#835639", "#8a5b3c", "#85573a"];
  for (let row = 0; row < 4; row++) {
    px(ctx, 0, row * 8, cols[row], 32, 8);
    px(ctx, 0, row * 8, "#734a30", 32, 1);
    const j = Math.floor(r() * 32);
    px(ctx, j, row * 8, "#734a30", 1, 8);
    for (let i = 0; i < 2; i++) px(ctx, Math.floor(r() * 32), row * 8 + 3 + Math.floor(r() * 3), "#7e5236", 3 + Math.floor(r() * 3), 1);
  }
  return toTexture(c, { repeat: true, flipY: true });
}

// Veinage de bois (chêne) : fibres longues dans le sens de la texture (u), quelques nœuds.
// Les UV sont calées dans Blender sur la longueur de chaque planche : 64 px ≈ 50 cm de fil.
export function woodTex(base, grain, dark, seed = 3) {
  const [c, ctx] = canvas(64, 16);
  const r = rng(seed);
  px(ctx, 0, 0, base, 64, 16);
  // légères variations de ton par bande, comme les cernes d'une planche
  for (let y = 0; y < 16; y++) if (r() < 0.35) px(ctx, 0, y, grain, 64, 1);
  // fibres : quelques traits sombres de longueur variable, raccordés d'un bord à l'autre
  for (let i = 0; i < 7; i++) {
    const y = Math.floor(r() * 16), x = Math.floor(r() * 64), len = 8 + Math.floor(r() * 30);
    for (let k = 0; k < len; k++) px(ctx, (x + k) % 64, y, dark);
  }
  // nœud : œil ovale allongé dans le sens du fil, entouré d'un cerne plus clair
  const kx = 18 + Math.floor(r() * 30), ky = 6 + Math.floor(r() * 4);
  px(ctx, kx - 4, ky - 1, grain, 9, 3); px(ctx, kx - 2, ky - 2, grain, 5, 5);
  px(ctx, kx - 2, ky, dark, 5, 1); px(ctx, kx - 1, ky - 1, dark, 3, 1);
  return toTexture(c, { repeat: true });
}

export function wallTex(base, stripe, dot) {
  const [c, ctx] = canvas(16, 16);
  px(ctx, 0, 0, base, 16, 16);
  px(ctx, 0, 0, stripe, 2, 16);
  px(ctx, 8, 0, stripe, 1, 16);
  [[4, 3], [12, 11]].forEach(([x, y]) => {
    px(ctx, x, y, dot);
    px(ctx, x - 1, y + 1, dot, 3, 1);
    px(ctx, x, y + 2, dot);
  });
  return toTexture(c, { repeat: true, flipY: true });
}

export function rugTex() {
  const [c, ctx] = canvas(44, 30);
  px(ctx, 0, 0, "#7a1f33", 44, 30);
  px(ctx, 2, 2, "#b33951", 40, 26);
  px(ctx, 4, 4, "#e9c46a", 36, 22);
  px(ctx, 5, 5, "#b33951", 34, 20);
  for (let i = 0; i < 4; i++) {
    const cx = 10 + i * 8, cy = 15;
    for (let d = 0; d < 4; d++) {
      px(ctx, cx - d, cy - 3 + d, "#f4a261");
      px(ctx, cx + d, cy - 3 + d, "#f4a261");
      px(ctx, cx - d, cy + 3 - d, "#f4a261");
      px(ctx, cx + d, cy + 3 - d, "#f4a261");
    }
    px(ctx, cx, cy, "#264653");
  }
  for (let x = 0; x < 44; x += 2) { px(ctx, x, 0, "#e9c46a"); px(ctx, x + 1, 29, "#e9c46a"); }
  return toTexture(c);
}

// Écran du PC vu depuis la chambre. En mode "idle", c'est une copie fidèle du bureau
// de CV-OS (mêmes icônes, libellés et positions qu'en 800×600) : aucun saut visuel
// quand le vrai bureau HTML prend le relais à la fin du zoom.
// `icons` : [{ label, icon }] dans l'ordre du bureau.
export function createScreen(icons = []) {
  const [c, ctx] = canvas(800, 600);
  const tex = toTexture(c);
  // l'écran est vu de loin puis de près : filtrage lissé + mipmaps pour rester net sans scintiller
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  let mode = "idle";
  let modeT = 0;
  let last = 0;
  let idleKey = "";
  let vw = 800; // résolution virtuelle de l'OS qui prendra le relais (800×600, ou 420×315 sur téléphone)

  const images = icons.map(({ icon }) => {
    const img = new Image();
    img.src = iconURL(icon);
    return img;
  });

  // reprend la mise en page CSS de .icons / .dicon / .taskbar (style.css)
  function drawIdle() {
    const now = new Date();
    const clock = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    const ready = images.every((i) => i.complete) && document.fonts.check('13px "Pixelify Sans"');
    const key = clock + ready + vw;
    if (key === idleKey) return false; // rien n'a changé : pas de ré-envoi de texture
    idleKey = key;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(wallpaperCanvas(), 0, 0, 800, 600);
    // le bureau est dessiné à la résolution virtuelle de l'OS puis agrandi à la texture 800×600,
    // exactement comme l'OS HTML est agrandi sur l'écran : même disposition, mêmes proportions
    const vh = vw * 0.75;
    ctx.save();
    ctx.scale(800 / vw, 600 / vh);
    // icônes : grille en colonnes (lignes de 76 px + 4 px d'écart, autant qu'il en tient au-dessus
    // de la barre des tâches), colonnes de 86 px
    const rows = Math.max(1, Math.floor((vh - 44 + 4) / 80));
    const font = '"Pixelify Sans", monospace';
    icons.forEach(({ label }, i) => {
      const col = Math.floor(i / rows), row = i % rows;
      const x = 6 + col * 90, y = 8 + row * 80;
      if (images[i].complete) ctx.drawImage(images[i], x + 25, y + 4, 36, 36);
      ctx.font = `13px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#000";
      ctx.fillText(label, x + 44, y + 46);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + 43, y + 45);
    });
    // barre des tâches (30 px de haut en bas de l'écran virtuel)
    const by = vh - 30;
    const bar = ctx.createLinearGradient(0, by, 0, vh);
    bar.addColorStop(0, "#3a80f3"); bar.addColorStop(0.07, "#2a68e0"); bar.addColorStop(0.75, "#245edb"); bar.addColorStop(0.76, "#1941a5");
    ctx.fillStyle = bar; ctx.fillRect(0, by, vw, 30);
    const start = ctx.createLinearGradient(0, by, 0, vh);
    start.addColorStop(0, "#6fd46f"); start.addColorStop(0.07, "#3c9c3c"); start.addColorStop(0.75, "#34913a"); start.addColorStop(0.76, "#2d7d2d");
    ctx.fillStyle = start;
    ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(112, by); ctx.arc(112, by + 15, 15, -Math.PI / 2, Math.PI / 2); ctx.lineTo(0, vh); ctx.fill();
    [["#f35325", 0, 0], ["#81bc06", 8, 0], ["#05a6f0", 0, 8], ["#ffba08", 8, 8]].forEach(([col, dx, dy]) => px(ctx, 10 + dx, by + 8 + dy, col, 7, 7));
    ctx.font = `italic bold 17px ${font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#1a4d1a"; ctx.fillText("démarrer", 34, by + 16);
    ctx.fillStyle = "#fff"; ctx.fillText("démarrer", 33, by + 15);
    px(ctx, vw - 70, by, "#0f8ae5", 70, 30);
    px(ctx, vw - 70, by, "#0b5fb3", 2, 30);
    ctx.font = `13px ${font}`;
    ctx.fillStyle = "#fff"; ctx.fillText(clock, vw - 40, by + 15);
    ctx.restore();
    crtFx();
    return true;
  }

  // même effet que .crt-fx (style.css) posé sur l'OS : l'écran 3D et l'OS se ressemblent pendant le fondu.
  // Tailles ramenées à la texture 800×600 (l'OS fait ~1000 px de large à l'écran)
  function crtFx() {
    // vignette : ellipse transparente jusqu'à 65 %, assombrie à 35 % dans les coins
    ctx.save();
    ctx.translate(400, 300);
    ctx.scale(1, 0.75);
    const r = 400 * Math.SQRT2;
    const vig = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    vig.addColorStop(0.65, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,.35)");
    ctx.fillStyle = vig;
    ctx.fillRect(-400, -400, 800, 800);
    ctx.restore();
    // ombre intérieure (box-shadow: inset 0 0 24px rgba(0,0,0,.55))
    const E = 20;
    [[0, 0, 800, E, 0, 0, 0, E], [0, 600 - E, 800, E, 0, 600, 0, 600 - E],
     [0, 0, E, 600, 0, 0, E, 0], [800 - E, 0, E, 600, 800, 0, 800 - E, 0]].forEach(([x, y, w, h, x0, y0, x1, y1]) => {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, "rgba(0,0,0,.28)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    });
    // reflet en diagonale depuis le coin haut gauche (linear-gradient 135deg)
    const gl = ctx.createLinearGradient(50, -50, 750, 650);
    gl.addColorStop(0, "rgba(255,255,255,.05)");
    gl.addColorStop(0.35, "rgba(255,255,255,0)");
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, 800, 600);
  }

  function draw(t) {
    if (t - last < 1 / 20) return; // 20 fps, c'est rétro
    last = t;
    const lt = t - modeT;
    if (mode === "idle") {
      if (drawIdle()) tex.needsUpdate = true;
      return;
    }
    idleKey = "";
    ctx.save();
    ctx.scale(800 / 128, 600 / 96); // les autres modes sont dessinés en 128×96
    if (mode === "boot") {
      // allumage CRT : ligne blanche qui s'ouvre, puis texte
      px(ctx, 0, 0, "#000000", 128, 96);
      if (lt < 0.35) {
        const h = Math.max(1, Math.round((lt / 0.35) * 96));
        px(ctx, 0, 48 - h / 2, "#e8f4ff", 128, h);
      } else {
        ctx.fillStyle = "#c8c8c8";
        ctx.font = "8px monospace";
        ctx.fillText("CV-BIOS v4.20", 4, 10);
        if (lt > 0.7) ctx.fillText("Memoire ... OK", 4, 20);
        if (lt > 1.1) ctx.fillText("Motivation . 100%", 4, 30);
        if (Math.floor(t * 3) % 2) px(ctx, 4, 36, "#c8c8c8", 5, 1);
      }
    } else if (mode === "hidden") {
      px(ctx, 0, 0, "#141414", 128, 96);
    } else {
      px(ctx, 0, 0, "#050805", 128, 96);
    }
    ctx.restore();
    tex.needsUpdate = true;
  }
  return {
    texture: tex,
    draw,
    setMode(m, t) { mode = m; modeT = t; last = 0; },
    // disposition du bureau à reproduire (largeur virtuelle de l'OS : 800 ou 420)
    setLayout(w) { if (w !== vw) { vw = w; last = 0; } },
    get mode() { return mode; },
  };
}

// Fond d'écran de l'OS (colline verte façon années 2000)
// Grillage métallique fin en losanges (fils diagonaux, transparent entre les fils)
export function wireMeshTex() {
  const S = 32;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  g.strokeStyle = "#3a3a3a";
  g.lineWidth = 7; // fils épais par rapport à la maille : restent lisibles de loin
  g.lineCap = "square";
  for (const dx of [-S, 0, S]) {
    g.beginPath(); g.moveTo(dx, 0); g.lineTo(dx + S, S); g.stroke();
    g.beginPath(); g.moveTo(dx + S, 0); g.lineTo(dx, S); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(16, 5); // mailles assez grandes pour faire quelques pixels à l'écran
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Grille d'enceinte perforée (petits trous réguliers)
export function speakerGrilleTex() {
  const [c, ctx] = canvas(8, 8);
  px(ctx, 0, 0, "#3a3a3a", 8, 8);
  px(ctx, 2, 2, "#141414", 3, 3);
  px(ctx, 3, 1, "#141414", 1, 1); px(ctx, 3, 5, "#141414", 1, 1);
  px(ctx, 1, 3, "#141414", 1, 1); px(ctx, 5, 3, "#141414", 1, 1);
  const t = toTexture(c, { repeat: true, flipY: true });
  t.repeat.set(9, 12);
  return t;
}

// Double page du bloc-notes à spirale : papier ligné + quelques notes manuscrites
export function notebookTex() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 716;
  const g = c.getContext("2d");
  const W = c.width, H = c.height, half = W / 2;
  g.fillStyle = "#fbfaf5";
  g.fillRect(0, 0, W, H);
  // lignes horizontales (comme la photo), marge haute plus grande
  g.strokeStyle = "#b9c3cf";
  g.lineWidth = 2;
  for (let y = 92; y < H - 20; y += 30) {
    g.beginPath(); g.moveTo(20, y); g.lineTo(half - 34, y); g.moveTo(half + 34, y); g.lineTo(W - 20, y); g.stroke();
  }
  // ombre de la reliure au centre
  const gut = g.createLinearGradient(half - 40, 0, half + 40, 0);
  gut.addColorStop(0, "rgba(0,0,0,0)"); gut.addColorStop(0.5, "rgba(0,0,0,0.18)"); gut.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gut; g.fillRect(half - 40, 0, 80, H);
  // trous de la spirale
  g.fillStyle = "#d8d4c8";
  for (let i = 0; i < 18; i++) {
    const y = 26 + i * ((H - 52) / 17);
    g.beginPath(); g.arc(half - 22, y, 5, 0, Math.PI * 2); g.arc(half + 22, y, 5, 0, Math.PI * 2); g.fill();
  }
  // écriture au stylo bleu
  const ink = "#1f3a8f";
  const hand = (size) => `${size}px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive`;
  g.fillStyle = ink;
  g.textBaseline = "alphabetic";
  const write = (txt, x, line, size = 24, rot = 0) => {
    g.save(); g.translate(x, 86 + line * 30); g.rotate(rot); g.font = hand(size); g.fillText(txt, 0, 0); g.restore();
  };
  write("To do", 40, 0, 32, -0.02);
  g.strokeStyle = ink; g.lineWidth = 3;
  g.beginPath(); g.moveTo(40, 96); g.quadraticCurveTo(100, 101, 150, 94); g.stroke();
  write("- finir le CV en 3D", 44, 2, 23);
  write("- mettre à jour LinkedIn", 44, 3, 23);
  write("- nouvelles features GenDon", 44, 4, 23);
  write("- relancer les recruteurs", 44, 5, 23);
  write("- racheter du café !", 44, 7, 23, -0.03);
  // coches sur la première ligne
  g.lineWidth = 4; g.strokeStyle = "#2a9d8f";
  g.beginPath(); g.moveTo(410, 136); g.lineTo(420, 148); g.lineTo(442, 120); g.stroke();
  // page de droite : idées + petit croquis d'écran
  g.fillStyle = ink;
  write("Idées :", half + 50, 0, 30, -0.015);
  write("* mode jour / nuit", half + 56, 2, 22);
  write("* easter egg Konami", half + 56, 3, 22);
  write("* musique chiptune ?", half + 56, 4, 22);
  g.strokeStyle = ink; g.lineWidth = 3;
  g.strokeRect(half + 90, 290, 170, 118);                      // croquis du moniteur
  g.strokeRect(half + 105, 303, 140, 88);
  g.beginPath(); g.moveTo(half + 150, 408); g.lineTo(half + 140, 436); g.lineTo(half + 212, 436); g.lineTo(half + 200, 408); g.stroke();
  write("CV-OS 98", half + 128, 11, 20, 0);
  g.beginPath(); g.arc(half + 330, 360, 28, 0, Math.PI * 2); g.stroke();   // petit rond gribouillé
  write("v2 ?", half + 312, 11, 22, 0.05);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.flipY = false; // UV exportées depuis Blender (glTF)
  return t;
}

// Feuille de CV imprimée (aperçu lisible de loin : nom, titre, rubriques, lignes de texte)
export function cvSheetTex(p) {
  const c = document.createElement("canvas");
  c.width = 420;
  c.height = 594;
  const g = c.getContext("2d");
  g.fillStyle = "#fbfaf6";
  g.fillRect(0, 0, 420, 594);
  g.fillStyle = "#1d3557";
  g.font = "bold 30px Arial, sans-serif";
  g.fillText(p.name, 30, 56);
  g.fillStyle = "#457b9d";
  g.font = "18px Arial, sans-serif";
  g.fillText(p.title, 30, 82);
  g.fillStyle = "#777";
  g.font = "10px Arial, sans-serif";
  g.fillText(p.contact, 30, 102);
  let y = 132;
  const r = rng(9);
  for (const s of p.sections) {
    g.fillStyle = "#1d3557";
    g.font = "bold 13px Arial, sans-serif";
    g.fillText(s, 30, y);
    g.fillRect(30, y + 5, 360, 1.5);
    y += 20;
    const lines = 2 + Math.floor(r() * 4);
    g.fillStyle = "#b5b5b5";
    for (let i = 0; i < lines && y < 575; i++) {
      g.fillRect(30, y, 150 + r() * 210, 5);
      y += 11;
    }
    y += 14;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

let wallpaper = null;
export function wallpaperURL() {
  return wallpaperCanvas().toDataURL();
}
export function wallpaperCanvas() {
  if (wallpaper) return wallpaper;
  const [c, ctx] = canvas(200, 150);
  wallpaper = c;
  // dégradé en bandes fines aux teintes très proches : effet rétro discret, sans rayures marquées
  const N = 12, BAND = 8;
  const top = new THREE.Color("#3574d8"), bottom = new THREE.Color("#86bcf7");
  const sky = Array.from({ length: N }, (_, i) => "#" + top.clone().lerp(bottom, i / (N - 1)).getHexString());
  px(ctx, 0, 0, sky[N - 1], 200, 150);
  sky.forEach((col, i) => {
    px(ctx, 0, i * BAND, col, 200, BAND);
    // tramage léger à la jonction avec la bande suivante
    if (i < N - 1) for (let x = 0; x < 200; x += 2) px(ctx, x + (i % 2), i * BAND + BAND - 1, sky[i + 1]);
  });
  const cloud = (x, y, s) => {
    px(ctx, x + 2 * s, y, "#ffffff", 6 * s, 2 * s);
    px(ctx, x, y + 2 * s, "#ffffff", 12 * s, 3 * s);
    px(ctx, x + 1 * s, y + 5 * s, "#e3efff", 10 * s, 1 * s);
  };
  cloud(20, 18, 2); cloud(120, 30, 1); cloud(150, 10, 2); cloud(70, 45, 1);
  // collines
  for (let x = 0; x < 200; x++) {
    const h1 = Math.round(100 + Math.sin((x + 20) / 38) * 12 + Math.sin(x / 11) * 2);
    px(ctx, x, h1, "#4caf3f", 1, 150 - h1);
    px(ctx, x, h1, "#7fd35e", 1, 2);
    const h2 = Math.round(118 + Math.sin((x - 60) / 30) * 8);
    px(ctx, x, h2, "#2e8b2e", 1, 150 - h2);
    px(ctx, x, h2, "#56b848", 1, 1);
  }
  const r = rng(5);
  for (let i = 0; i < 90; i++) px(ctx, Math.floor(r() * 200), 115 + Math.floor(r() * 35), "#3fa33f");
  return c;
}
