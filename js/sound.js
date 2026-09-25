// Effets sonores rétro 100 % synthétisés (WebAudio) : aucun fichier audio.

let ctx = null;
let master = null;
let muted = false;
const VOL = 0.45;
try { muted = localStorage.getItem("cv-muted") === "1"; } catch {}

function tone(freq, dur, { type = "square", vol = 0.1, when = 0, slide = null, attack = 0.005 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

let noiseBuf = null;
function noise(dur, { vol = 0.1, when = 0, freq = 2000, q = 1, type = "bandpass", sweep = null } = {}) {
  if (!ctx) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + when;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

export const sound = {
  unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : VOL;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
  },
  get muted() { return muted; },
  toggle() {
    muted = !muted;
    try { localStorage.setItem("cv-muted", muted ? "1" : "0"); } catch {}
    if (master) master.gain.value = muted ? 0 : VOL;
    return muted;
  },

  click() {
    noise(0.025, { vol: 0.25, freq: 3500, q: 2 });
    tone(180, 0.03, { type: "triangle", vol: 0.08 });
  },
  key() { noise(0.02 + Math.random() * 0.02, { vol: 0.12, freq: 2500 + Math.random() * 2000, q: 3 }); },
  open() {
    [523, 784, 1046].forEach((f, i) => tone(f, 0.09, { vol: 0.06, when: i * 0.05 }));
  },
  close() {
    [880, 587, 392].forEach((f, i) => tone(f, 0.08, { vol: 0.05, when: i * 0.045 }));
  },
  minimize() { tone(700, 0.12, { vol: 0.05, slide: 300 }); },
  ding() {
    tone(1318, 0.5, { type: "triangle", vol: 0.12 });
    tone(988, 0.6, { type: "triangle", vol: 0.1, when: 0.12 });
  },
  error() {
    tone(220, 0.18, { vol: 0.08 });
    tone(165, 0.3, { vol: 0.08, when: 0.14 });
  },
  beep() { tone(1000, 0.16, { vol: 0.07 }); },
  crtOn() {
    tone(55, 0.35, { type: "sine", vol: 0.3 });
    noise(0.9, { vol: 0.18, freq: 400, sweep: 6000, type: "bandpass", q: 0.8 });
    tone(15000, 1.6, { type: "sine", vol: 0.015, when: 0.1, attack: 0.3 });
  },
  crtOff() {
    noise(0.5, { vol: 0.2, freq: 6000, sweep: 200, q: 0.8 });
    tone(900, 0.4, { type: "sine", vol: 0.08, slide: 60 });
  },
  hdd(duration = 2) {
    const n = Math.floor(duration * 14);
    for (let i = 0; i < n; i++) {
      noise(0.015 + Math.random() * 0.03, { vol: 0.05 + Math.random() * 0.08, freq: 800 + Math.random() * 2500, q: 4, when: Math.random() * duration });
    }
  },
  // imprimante : ronronnement doux, petits "tic" feutrés et glissement du papier
  print(duration = 1.6) {
    tone(110, duration + 0.3, { type: "sine", vol: 0.035, attack: 0.15 });
    const passes = Math.floor(duration / 0.25);
    for (let i = 0; i < passes; i++) {
      const w = 0.15 + i * 0.25;
      noise(0.18, { vol: 0.025, freq: 700, q: 0.8, type: "lowpass", when: w });
      tone(520, 0.03, { type: "sine", vol: 0.02, when: w + 0.16 });
    }
    noise(0.5, { vol: 0.03, freq: 900, sweep: 400, q: 0.5, type: "lowpass", when: duration }); // la feuille glisse
  },
  startup() {
    // petite mélodie de démarrage façon années 2000
    const notes = [[622, 0], [466, 0.18], [415, 0.36], [622, 0.54], [932, 0.72]];
    notes.forEach(([f, w]) => {
      tone(f, 0.9, { type: "triangle", vol: 0.1, when: w, attack: 0.02 });
      tone(f / 2, 0.9, { type: "square", vol: 0.025, when: w, attack: 0.02 });
    });
    [311, 466, 622].forEach((f) => tone(f, 2.2, { type: "sine", vol: 0.06, when: 0.72, attack: 0.1 }));
  },
  shutdown() {
    const notes = [[932, 0], [622, 0.2], [466, 0.4], [311, 0.6]];
    notes.forEach(([f, w]) => tone(f, 0.7, { type: "triangle", vol: 0.1, when: w, attack: 0.02 }));
  },
};
