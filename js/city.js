// Ville de nuit vue par la fenêtre : un shader sur la vitre qui calcule, pour chaque
// pixel, ce qu'un œil placé dans la chambre verrait à travers le verre. Le ciel (lune,
// étoiles) est à l'infini et trois rangées d'immeubles sont à des profondeurs différentes :
// l'œil est la vraie caméra, donc la ville glisse exactement comme le reste de la chambre.
import * as THREE from "three";

const DENSITY = 110;           // texels par mètre de vitre : même finesse apparente pour chaque plan
const SKY_SCALE = 2.5;         // unité des coordonnées de ciel : 1 m de vitre ≈ 0,4 unité vu depuis le départ
const A_MIN = -0.35, A_MAX = 0.95; // hauteurs couvertes par les calques, en fraction de la vitre

const WARM = ["#ffd27a", "#ffc15e", "#ffe7a8", "#ffb347", "#ffdf94"];
const TV = ["#7fb8ff", "#9fd0ff", "#6a9cff", "#b5e0ff"];

// du plus lointain au plus proche ; `tops` = hauteur des toits en fraction de vitre (vue de face)
const LAYERS = [
  {
    depth: 40, seed: 5, widths: [6, 18], tops: [0.2, 0.52], base: 0.12,
    body: ["#171a38", "#15183a", "#191c3e"], rim: "#262b58", win: [1, 1], gap: [1, 2], lit: 0.14,
    dark: null, antenna: 0.18, stepped: 0.2,
  },
  {
    depth: 8, seed: 17, widths: [12, 30], tops: [0.04, 0.42], base: -0.1,
    body: ["#0d0f24", "#0e1027", "#0c0e21"], rim: "#1d2146", win: [2, 2], gap: [2, 3], lit: 0.24,
    dark: "#14173a", antenna: 0.14, stepped: 0.28,
  },
  {
    depth: 2.2, seed: 29, widths: [30, 62], tops: [-0.14, 0.24], base: null,
    body: ["#07080f", "#080913", "#06070d"], rim: "#161a33", win: [3, 4], gap: [3, 4], lit: 0.32,
    dark: "#10132b", antenna: 0.2, stepped: 0.15, props: true,
  },
];

function rng(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// Un calque d'immeubles dessiné sur un canvas qui se répète horizontalement
function buildLayer(L, W, H) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  const r = rng(L.seed);
  const int = ([a, b]) => a + Math.floor(r() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const yOf = (a) => Math.round(((A_MAX - a) / (A_MAX - A_MIN)) * H);
  // dessine aussi la partie qui dépasse à droite au début du canvas : raccord invisible
  const put = (x, y, w, h, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
    if (x + w > W) ctx.fillRect(x - W, y, w, h);
  };
  const windows = [], tvs = [], blinkers = [];

  // socle continu pour les plans lointains : pas de trou vers le ciel en bas de la vitre
  if (L.base !== null) {
    const yb = yOf(L.base);
    put(0, yb, W, H - yb, L.body[0]);
    for (let i = 0; i < W * 0.35; i++) put(Math.floor(r() * W), yb + 2 + Math.floor(r() * (H - yb)), 1, 1, pick(WARM));
  }

  let x = 0;
  while (x < W) {
    const w = int(L.widths);
    const top = yOf(L.tops[0] + r() * (L.tops[1] - L.tops[0]));
    const body = pick(L.body);
    put(x, top, w, H - top, body);

    // toit : étage en retrait, antenne clignotante, château d'eau, climatiseurs
    const roll = r();
    if (roll < L.stepped && w > 8) {
      const sw = Math.round(w * (0.4 + r() * 0.3)), sx = x + Math.floor((w - sw) / 2), sh = Math.max(2, Math.round(H * 0.04));
      put(sx, top - sh, sw, sh, body);
      put(sx, top - sh, sw, 1, L.rim);
      put(sx + sw - 1, top - sh, 1, sh, L.rim);
    } else if (roll < L.stepped + L.antenna) {
      const ah = Math.max(3, Math.round(H * (0.05 + r() * 0.06))), ax = x + Math.floor(w * (0.3 + r() * 0.4));
      put(ax, top - ah, 1, ah, L.rim);
      blinkers.push({ x: ax, y: top - ah - 1, w: 1, h: 1, on: "#ff4a4a", off: "#5a1f2a", period: 1.6 + r(), duty: 0.35, phase: r() * 3 });
    } else if (L.props && roll < 0.65) {
      // château d'eau sur pieds
      const tx = x + 4 + Math.floor(r() * Math.max(1, w - 14));
      put(tx + 1, top - 3, 1, 3, L.rim);
      put(tx + 6, top - 3, 1, 3, L.rim);
      put(tx, top - 9, 8, 6, body);
      put(tx + 1, top - 10, 6, 1, body);
      put(tx + 7, top - 9, 1, 6, L.rim);
      put(tx + 1, top - 10, 6, 1, L.rim);
    } else if (L.props) {
      for (let k = 0; k < 2; k++) {
        const bx = x + 3 + Math.floor(r() * Math.max(1, w - 8));
        put(bx, top - 2, 4, 2, body);
        put(bx, top - 2, 4, 1, L.rim);
      }
    }
    put(x, top, w, 1, L.rim);           // arête du toit éclairée par la lune
    put(x + w - 1, top, 1, H - top, L.rim); // flanc côté lune

    // fenêtres : grille classique ou bandeaux de bureaux
    const [ww, wh] = L.win, [gx, gy] = L.gap;
    const strips = r() < 0.2 && L.win[0] > 1;
    const litP = L.lit * (0.5 + r());
    for (let yy = top + 2 + (L.win[0] > 1 ? 1 : 0); yy + wh <= H; yy += wh + gy) {
      if (strips) {
        const lit = r() < litP;
        const win = { x: x + 2, y: yy, w: w - 4, h: Math.max(1, wh - 1), lit, col: pick(WARM), dark: L.dark };
        if (lit || L.dark) windows.push(win);
        continue;
      }
      for (let xx = x + 2; xx + ww <= x + w - 2; xx += ww + gx) {
        const lit = r() < litP;
        if (!lit && !L.dark) continue;
        const tv = lit && r() < 0.08;
        const win = { x: xx, y: yy, w: ww, h: wh, lit, col: tv ? TV[0] : pick(WARM), dark: L.dark, tv };
        windows.push(win);
        if (tv) tvs.push(win);
      }
    }

    // enseigne néon sur la façade (premier plan)
    if (L.props && r() < 0.3 && w > 36) {
      const nx = x + w - 6, ny = top + 6;
      put(nx - 1, ny - 1, 5, 15, "#15142a");
      for (let k = 0; k < 6; k++) {
        blinkers.push({ x: nx, y: ny + k * 2, w: 3, h: 1, on: k % 2 ? "#ff5fb1" : "#ff8fcf", off: "#4a2240", period: 3.4 + r(), duty: 0.88, phase: r() * 4, flicker: true });
      }
    }

    x += w + (r() < 0.35 ? int([1, 4]) : -int([0, 3]));
  }

  const drawWin = (win) => {
    if (win.lit) {
      put(win.x, win.y, win.w, win.h, win.col);
      // rebord plus sombre et rideau entrouvert sur les grandes fenêtres : un peu de vie
      if (win.h >= 3) put(win.x, win.y + win.h - 1, win.w, 1, "#b87a36");
      if (win.w >= 3 && win.curtain) put(win.x, win.y, 1, win.h - 1, "#c98f46");
    } else put(win.x, win.y, win.w, win.h, win.dark);
  };
  windows.forEach((w) => { w.curtain = r() < 0.4; drawWin(w); });

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return { tex, windows, tvs, blinkers, drawWin, put };
}

const vertexShader = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// Couleurs écrites directement en sRGB (textures sans espace colorimétrique, pas de conversion en sortie)
const fragmentShader = /* glsl */ `
varying vec3 vW;
uniform float uTime, uQ, uMoonR, uK;
uniform vec3 uEye, uOff;
uniform vec2 uMoon, uSkyC;
uniform sampler2D uT0, uT1, uT2;
uniform vec4 uL0, uL1, uL2;   // profondeur, texels/m ÷ largeur, y du bas, 1 ÷ hauteur
uniform vec4 uGlass;          // z du bord gauche, largeur, y du bas, hauteur

float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

// point où le rayon œil → vitre traverse le plan d'immeubles situé à L.x mètres derrière
vec4 layer(sampler2D tx, vec4 L, float off, vec3 P, vec3 V, float D) {
  vec3 h = P + V * (L.x / D);
  float v = (h.y - L.z) * L.w;
  if (v > 1.0) return vec4(0.0);
  return texture2D(tx, vec2(-h.z * L.y + off, max(v, 0.001)));
}

float crater(vec2 m, vec3 c) {
  float d = length(m - c.xy) / c.z;
  return d < 0.75 ? 0.22 : d < 1.0 ? -0.12 : 0.0; // creux sombre, bord éclairé
}

void main() {
  vec3 P = vW;
  vec3 V = P - uEye;
  float D = -V.x;
  vec2 sky = vec2(-V.z, V.y) / D * uK; // direction de vue : le ciel est à l'infini
  vec2 g = floor(sky / uQ);             // gros pixel de ciel
  vec2 sp = (g + 0.5) * uQ;
  float dth = bayer4(g);
  vec2 rel = sp - uSkyC;

  // dégradé doux : bleu clair au ras des toits (lueur de la ville), bleu nuit en haut
  float k = clamp((rel.y + 0.2) / 0.42, 0.0, 1.0);
  vec3 col = mix(vec3(0.27, 0.32, 0.58), vec3(0.13, 0.17, 0.40), smoothstep(0.0, 0.5, k));
  col = mix(col, vec3(0.05, 0.07, 0.20), smoothstep(0.45, 1.0, k));

  float md = length(sp - uMoon) / uMoonR;
  float away = smoothstep(2.0, 3.4, md);

  // quelques étoiles, surtout en haut, qui scintillent doucement
  float h = hash(g);
  float alt = smoothstep(0.1, 0.7, k);
  if (h > 1.0 - 0.006 * alt) {
    float tw = 0.7 + 0.3 * sin(uTime * (0.8 + hash(g + 7.1) * 1.5) + h * 80.0);
    col = mix(col, vec3(0.95, 0.95, 1.0), tw * away * (0.4 + 0.6 * hash(g + 1.7)));
  }
  // rares étoiles brillantes en croix
  vec2 cg = floor(g / 14.0);
  if (hash(cg + 5.0) > 0.86) {
    vec2 c = cg * 14.0 + 3.0 + floor(vec2(hash(cg + 1.0), hash(cg + 2.0)) * 8.0);
    vec2 dd = abs(g - c);
    float arm = min(dd.x, dd.y) < 0.5 ? max(dd.x, dd.y) : 9.0;
    float s = arm < 0.5 ? 1.0 : arm < 1.5 ? 0.45 : 0.0;
    col = mix(col, vec3(1.0, 0.97, 0.9), s * away * alt);
  }

  // étoile filante de temps en temps
  float cyc = floor(uTime / 14.0), lt = uTime - cyc * 14.0;
  if (lt < 0.8) {
    vec2 st = uSkyC + vec2((hash(vec2(cyc, 1.0)) - 0.5) * 0.4, 0.1 + hash(vec2(cyc, 2.0)) * 0.08);
    vec2 dir = normalize(vec2(hash(vec2(cyc, 3.0)) < 0.5 ? -1.0 : 1.0, -0.45));
    vec2 head = st + dir * lt * 0.3;
    vec2 pa = sp - head;
    float along = clamp(dot(pa, -dir), 0.0, 0.07);
    float dist = length(pa + dir * along);
    if (dist < uQ * 0.9) col = mix(col, vec3(1.0, 0.95, 0.85), (1.0 - along / 0.07) * sin(lt / 0.8 * 3.14159));
  }

  // lune : halo doux puis disque avec relief, mers et cratères
  if (md >= 1.0) {
    col += vec3(0.35, 0.4, 0.65) * 0.3 * exp(-(md - 1.0) * 1.1);
  } else {
    vec2 m = (sp - uMoon) / uMoonR;
    vec3 n = vec3(m, sqrt(max(0.0, 1.0 - dot(m, m))));
    float l = dot(n, normalize(vec3(0.5, 0.35, 0.8)));
    float mare = noise(m * 2.2 + 4.0) * 0.65 + noise(m * 5.0 + 1.3) * 0.35;
    float cr = crater(m, vec3(0.32, 0.28, 0.2)) + crater(m, vec3(-0.25, -0.32, 0.17)) + crater(m, vec3(0.05, -0.05, 0.11))
      + crater(m, vec3(0.5, -0.3, 0.12)) + crater(m, vec3(-0.42, 0.32, 0.1)) + crater(m, vec3(-0.05, 0.55, 0.09));
    float tone = 0.25 + l * 0.85 - smoothstep(0.5, 0.62, mare) * 0.22 - cr;
    float tq = floor(clamp(tone, 0.0, 1.0) * 4.0 + dth * 0.9) / 4.0;
    col = mix(vec3(0.44, 0.44, 0.58), vec3(1.0, 0.97, 0.86), tq);
  }

  // trois rangées d'immeubles en silhouettes sombres, de plus en plus noires vers l'avant
  vec4 c0 = layer(uT0, uL0, uOff.x, P, V, D);
  col = mix(col, c0.rgb, c0.a);
  vec4 c1 = layer(uT1, uL1, uOff.y, P, V, D);
  col = mix(col, c1.rgb, c1.a);
  vec4 c2 = layer(uT2, uL2, uOff.z, P, V, D);
  col = mix(col, c2.rgb, c2.a);

  // la vitre : reflets obliques fixes, qui ne suivent pas la parallaxe
  float gu = (uGlass.x - P.z) / uGlass.y, ga = (P.y - uGlass.z) / uGlass.w;
  float sh = fract(gu * 0.8 + ga * 0.5);
  col += vec3(0.55, 0.65, 1.0) * (step(0.6, sh) * step(sh, 0.66) * 0.03 + step(0.72, sh) * step(sh, 0.735) * 0.025);
  gl_FragColor = vec4(col, 1.0);
}`;

// glass : le mesh de la vitre (mur de gauche, face tournée vers +x) ; startCam : position de départ
// de la caméra, qui sert à caler la composition (lune, hauteur des toits) sur la vue d'accueil
export function createCity(glass, startCam) {
  const box = new THREE.Box3().setFromObject(glass);
  const center = box.getCenter(new THREE.Vector3());
  const zLeft = box.max.z, gw = box.max.z - box.min.z, y0 = box.min.y, gh = box.max.y - box.min.y;
  const H = Math.round(DENSITY * gh * (A_MAX - A_MIN)), W = 512;

  const e0 = startCam.clone();
  const D0 = Math.max(e0.x - center.x, 0.3); // distance caméra de départ → vitre
  const skyAt = (u, a) => new THREE.Vector2(-(zLeft - u * gw - e0.z), y0 + a * gh - e0.y).divideScalar(SKY_SCALE);

  const layers = LAYERS.map((L) => buildLayer(L, W, H));
  const uniforms = {
    uTime: { value: 0 },
    uEye: { value: e0.clone() },
    uK: { value: D0 / SKY_SCALE },
    uQ: { value: 1 / (DENSITY * SKY_SCALE) },
    uMoon: { value: skyAt(0.64, 0.79) },
    uMoonR: { value: 0.075 / SKY_SCALE }, // ~7,5 cm de rayon sur la vitre
    uSkyC: { value: skyAt(0.5, 0.5) },
    uOff: { value: new THREE.Vector3(0.13, 0.41, 0.77) },
    uGlass: { value: new THREE.Vector4(zLeft, gw, y0, gh) },
  };
  LAYERS.forEach((L, i) => {
    // calage vertical : vu depuis la caméra de départ, une hauteur `a` du calque tombe à la hauteur `a` de la vitre
    const f = (D0 + L.depth) / D0;
    const yAt = (a) => e0.y + (y0 + a * gh - e0.y) * f;
    const hM = yAt(A_MAX) - yAt(A_MIN);
    uniforms["uT" + i] = { value: layers[i].tex };
    uniforms["uL" + i] = { value: new THREE.Vector4(L.depth, H / hM / W, yAt(A_MIN), 1 / hM) };
  });

  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });

  // vie de la ville : fenêtres qui s'allument / s'éteignent, télés, antennes et néons qui clignotent
  let nextToggle = 0, nextTv = 0;
  const togglable = layers.filter((l) => l.windows.length && LAYERS[layers.indexOf(l)].dark);
  function update(t, cam) {
    uniforms.uTime.value = t;
    uniforms.uEye.value.copy(cam);
    layers.forEach((l) => {
      let dirty = false;
      l.blinkers.forEach((b) => {
        let on = ((t + b.phase) / b.period) % 1 < b.duty;
        if (b.flicker && on && Math.sin(t * 37 + b.phase * 11) > 0.93) on = false;
        if (on !== b.state) { b.state = on; l.put(b.x, b.y, b.w, b.h, on ? b.on : b.off); dirty = true; }
      });
      if (dirty) l.tex.needsUpdate = true;
    });
    if (t > nextToggle) {
      nextToggle = t + 0.25 + Math.random() * 0.5;
      const l = togglable[Math.floor(Math.random() * togglable.length)];
      const w = l.windows[Math.floor(Math.random() * l.windows.length)];
      if (!w.tv) {
        w.lit = !w.lit;
        l.drawWin(w);
        l.tex.needsUpdate = true;
      }
    }
    if (t > nextTv) {
      nextTv = t + 0.12;
      layers.forEach((l) => {
        if (!l.tvs.length) return;
        l.tvs.forEach((w) => { w.col = TV[Math.floor(Math.random() * TV.length)]; l.drawWin(w); });
        l.tex.needsUpdate = true;
      });
    }
  }

  return { material, update };
}
