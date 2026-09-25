// CV-OS 98 : le système d'exploitation rétro affiché dans l'écran du PC.
import { iconImg } from "./icons.js";
import { wallpaperURL } from "./textures.js";
import { artURL } from "./pixelart.js";

const h = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// résolution virtuelle de l'OS selon la largeur réelle de l'écran qui l'affiche (px) : partagée avec
// la texture de l'écran 3D, qui dessine le même bureau avant que l'OS HTML n'apparaisse
export const osVirtualWidth = (w) => (w < 620 ? 420 : 800);

export function createOS(root, CV, sound, { onQuit } = {}) {
  let VW = 800, VH = 600, scale = 1;
  let wallpaper = null;
  let z = 10;
  const wins = new Map();
  let bootToken = 0;
  let desktop, winLayer, tasks, startMenu, clockEl, soundBtn;

  // ---------------------------------------------------------------
  //  Mise à l'échelle : l'OS a une résolution virtuelle fixe,
  //  agrandie pour remplir l'écran du moniteur 3D.
  // ---------------------------------------------------------------
  function layout(w, hgt) {
    VW = osVirtualWidth(w);
    VH = VW * 0.75;
    scale = w / VW;
    root.style.width = VW + "px";
    root.style.height = VH + "px";
    root.style.transform = `scale(${scale}, ${hgt / VH})`;
    root.classList.toggle("os-small", VW < 800);
    // téléphone (même seuil que le cadrage de la caméra) : texte réduit. `os-small` ne suffit pas,
    // il s'active aussi sur un petit écran d'ordinateur, où le moniteur 3D fait moins de 620 px
    root.classList.toggle("os-phone", innerWidth < 700);
    for (const win of wins.values()) clampWin(win);
  }

  // ---------------------------------------------------------------
  //  Démarrage : BIOS → écran de chargement → bureau
  // ---------------------------------------------------------------
  async function boot({ desktopOnly = false } = {}) {
    const token = ++bootToken;
    root.innerHTML = "";
    wins.clear();
    const alive = () => token === bootToken;

    // PC déjà allumé : on arrive directement sur le bureau
    if (desktopOnly) {
      buildDesktop();
      await wait(500);
      if (alive()) balloon("Bienvenue sur CV-OS 98 !", "Cliquez sur une icône du bureau pour fouiller dans mes dossiers.");
      return;
    }

    let skip = false;
    const skipper = () => (skip = true);
    root.addEventListener("pointerdown", skipper, { once: true });
    window.addEventListener("keydown", skipper, { once: true });
    const pause = async (ms) => { if (!skip) await wait(ms); };

    // --- BIOS ---
    const bios = h("div", "bios");
    root.append(bios);
    const logo = h("div", "bios-logo");
    logo.innerHTML = `<span>★</span> CV-BIOS v4.20<br><small>(C) 1998 Pixel Megatrends Inc.</small>`;
    bios.append(logo);
    const lines = [
      ["Processeur : Cerveau(TM) 486DX @ 66 MHz", ""],
      ["Test mémoire : ", "mem"],
      ["Détection des compétences ........ ", "OK"],
      ["Détection de la motivation ....... ", "100%"],
      ["Niveau de curiosité .............. ", "MAXIMUM"],
      ["Lecteur de disquette A: .......... ", "OK"],
      ["", ""],
      [`Démarrage de CV-OS 98 depuis C:\\${CV.owner.name.replace(/\s+/g, "_")}...`, ""],
    ];
    sound.beep();
    for (const [txt, res, cls] of lines) {
      if (!alive()) return;
      const line = h("div", "bios-line", txt);
      bios.append(line);
      if (res === "mem") {
        const m = h("span", "hl");
        line.append(m);
        for (let k = 0; k <= 65536; k += 4096) {
          m.textContent = k + "K";
          if (!skip) { sound.key(); await wait(35); }
        }
        m.textContent = "65536K OK";
      } else if (res) {
        await pause(160);
        line.append(h("span", cls || "ok", res));
        if (!skip) sound.key();
      }
      await pause(140);
    }
    bios.append(h("div", "bios-foot", "Appuyez sur une touche pour passer…"));
    await pause(500);
    if (!alive()) return;

    // --- Écran de chargement ---
    bios.remove();
    const splash = h("div", "splash");
    splash.innerHTML = `
      <div class="splash-logo">
        <div class="flag"><i></i><i></i><i></i><i></i></div>
        <div><div class="splash-small">Pixel Megatrends</div>
        <div class="splash-title">CV-OS <b>98</b></div>
        <div class="splash-ed">Édition ${esc(CV.owner.name)}</div></div>
      </div>
      <div class="progress"><i></i></div>
      <div class="splash-copy">Copyright © 1998. Tous droits réservés</div>`;
    root.append(splash);
    if (!skip) sound.hdd(2.2);
    await pause(2300);
    if (!alive()) return;
    splash.remove();
    window.removeEventListener("keydown", skipper);

    buildDesktop();
    sound.startup();
    await wait(900);
    if (!alive()) return;
    balloon("Bienvenue sur CV-OS 98 !", "Cliquez sur une icône du bureau pour fouiller dans mes dossiers.");
  }

  // ---------------------------------------------------------------
  //  Bureau
  // ---------------------------------------------------------------
  function buildDesktop() {
    wallpaper ??= wallpaperURL();
    desktop = h("div", "desktop");
    desktop.style.backgroundImage = `url(${wallpaper})`;
    root.append(desktop);

    const icons = h("div", "icons");
    desktop.append(icons);
    const addIcon = (label, icon, action) => {
      const b = h("button", "dicon");
      b.append(iconImg(icon, 32), h("span", null, label));
      b.addEventListener("click", (e) => { e.stopPropagation(); sound.click(); action(); });
      icons.append(b);
    };
    CV.categories.forEach((cat) => addIcon(cat.label, cat.icon, () => openCategory(cat)));

    winLayer = h("div", "winlayer");
    desktop.append(winLayer);

    // --- barre des tâches ---
    const bar = h("div", "taskbar");
    const start = h("button", "start");
    start.innerHTML = `<span class="flag"><i></i><i></i><i></i><i></i></span><span>démarrer</span>`;
    start.addEventListener("click", (e) => { e.stopPropagation(); sound.click(); toggleStart(); });
    tasks = h("div", "tasks");
    const tray = h("div", "tray");
    soundBtn = h("button", "tray-btn");
    soundBtn.title = "Son";
    const refreshSound = () => { soundBtn.replaceChildren(iconImg(sound.muted ? "mute" : "sound", 16)); };
    refreshSound();
    soundBtn.addEventListener("click", (e) => { e.stopPropagation(); sound.toggle(); refreshSound(); document.dispatchEvent(new CustomEvent("cv-sound")); sound.click(); });
    document.addEventListener("cv-sound", refreshSound);
    clockEl = h("span", "clock");
    tray.append(soundBtn, clockEl);
    bar.append(start, tasks, tray);
    desktop.append(bar);
    tick();

    // --- menu démarrer ---
    startMenu = h("div", "startmenu");
    const head = h("div", "sm-head");
    head.append(iconImg("avatar", 36), h("span", null, CV.owner.name));
    const cols = h("div", "sm-cols");
    const left = h("div", "sm-left");
    const right = h("div", "sm-right");
    const item = (parent, label, icon, fn) => {
      const b = h("button", "sm-item");
      b.append(iconImg(icon, 24), h("span", null, label));
      b.addEventListener("click", (e) => { e.stopPropagation(); sound.click(); closeStart(); fn(); });
      parent.append(b);
    };
    CV.categories.forEach((cat) => item(left, cat.label, cat.icon, () => openCategory(cat)));
    item(right, "Mon CV", "computer", () => openExplorer("root", "Mon CV", "computer", rootNode()));
    item(right, "Télécharger mon CV", "docBlue", openPDF);
    item(right, "Lisez-moi", "doc", openReadme);
    const foot = h("div", "sm-foot");
    const off = h("button");
    // « Quitter » : on se lève du bureau, le PC reste allumé et tout reste ouvert
    off.className = "quit";
    off.title = "Quitter le PC (retour à la chambre)";
    off.append(iconImg("power", 24), h("span", null, "Quitter"));
    off.addEventListener("click", (e) => { e.stopPropagation(); closeStart(); onQuit?.(); });
    foot.append(off);
    cols.append(left, right);
    startMenu.append(head, cols, foot);
    desktop.append(startMenu);

    desktop.addEventListener("pointerdown", (e) => {
      if (!startMenu.contains(e.target) && !e.target.closest(".start")) closeStart();
    });
  }

  function tick() {
    if (!clockEl || !clockEl.isConnected) return;
    const d = new Date();
    clockEl.textContent = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    setTimeout(tick, 10000);
  }

  const toggleStart = () => startMenu.classList.toggle("open");
  const closeStart = () => startMenu?.classList.remove("open");

  function balloon(title, text) {
    const b = h("div", "balloon");
    b.innerHTML = `<b>${esc(title)}</b><p>${esc(text)}</p>`;
    const x = h("button", "balloon-x", "×");
    b.append(x);
    const kill = () => b.remove();
    b.addEventListener("click", kill);
    desktop.append(b);
    sound.ding();
    setTimeout(kill, 7000);
  }

  // ---------------------------------------------------------------
  //  Fenêtres
  // ---------------------------------------------------------------
  function openWindow({ id, title, icon, w = 520, hgt = 380, build }) {
    closeStart();
    // la bulle de bienvenue a fait son travail : elle ne doit pas masquer la fenêtre ouverte
    desktop.querySelector(".balloon")?.remove();
    if (wins.has(id)) {
      const win = wins.get(id);
      win.el.hidden = false;
      focus(win);
      return win;
    }
    const el = h("div", "win pop");
    const tb = h("div", "tb");
    const t = h("span", "t", title);
    tb.append(iconImg(icon, 16), t);
    const mk = (cls, label, fn) => {
      const b = h("button", "tbb " + cls, label);
      b.addEventListener("pointerdown", (e) => e.stopPropagation());
      b.addEventListener("click", (e) => { e.stopPropagation(); fn(); });
      tb.append(b);
    };
    const body = h("div", "wbody");
    el.append(tb, body);

    const n = wins.size;
    const small = VW < 800;
    const win = { id, el, body, titleEl: t, max: false, x: 0, y: 0, w: Math.min(w, VW - 20), h: Math.min(hgt, VH - 50) };
    win.x = Math.max(4, Math.min(VW - win.w - 4, 110 + n * 26));
    win.y = Math.max(4, Math.min(VH - 34 - win.h, 20 + n * 22));
    mk("min", "_", () => { sound.minimize(); el.hidden = true; refreshTasks(); });
    mk("max", "□", () => { sound.click(); toggleMax(win); });
    mk("x", "×", () => closeWindow(win));
    if (small) win.max = true;
    applyGeom(win);

    // déplacement de la fenêtre
    tb.addEventListener("pointerdown", (e) => {
      focus(win);
      if (win.max) return;
      const sx = e.clientX, sy = e.clientY, ox = win.x, oy = win.y;
      tb.setPointerCapture(e.pointerId);
      const move = (ev) => {
        win.x = ox + (ev.clientX - sx) / scale;
        win.y = oy + (ev.clientY - sy) / scale;
        clampWin(win);
      };
      const up = () => { tb.removeEventListener("pointermove", move); tb.removeEventListener("pointerup", up); };
      tb.addEventListener("pointermove", move);
      tb.addEventListener("pointerup", up);
    });
    tb.addEventListener("dblclick", () => toggleMax(win));
    el.addEventListener("pointerdown", () => focus(win));
    el.addEventListener("animationend", () => el.classList.remove("pop"));

    // bouton dans la barre des tâches
    win.task = h("button", "task");
    win.task.append(iconImg(icon, 16), h("span", null, title));
    win.task.addEventListener("click", (e) => {
      e.stopPropagation();
      sound.click();
      if (el.hidden) { el.hidden = false; focus(win); }
      else if (win.el.classList.contains("focused")) { el.hidden = true; refreshTasks(); }
      else focus(win);
    });
    tasks.append(win.task);

    winLayer.append(el);
    wins.set(id, win);
    build(body, win);
    sound.open();
    focus(win);
    return win;
  }

  function applyGeom(win) {
    const s = win.el.style;
    win.el.classList.toggle("max", win.max);
    // .winlayer s'arrête déjà au-dessus de la barre des tâches : 100 % colle la fenêtre contre elle
    if (win.max) { s.left = s.top = "0px"; s.width = "100%"; s.height = "100%"; }
    else { s.left = win.x + "px"; s.top = win.y + "px"; s.width = win.w + "px"; s.height = win.h + "px"; }
  }
  function clampWin(win) {
    win.w = Math.min(win.w, VW - 8);
    win.h = Math.min(win.h, VH - 38);
    win.x = Math.max(-win.w + 60, Math.min(VW - 60, win.x));
    win.y = Math.max(0, Math.min(VH - 30 - 26, win.y));
    applyGeom(win);
  }
  function toggleMax(win) {
    if (VW < 800) return;
    win.max = !win.max;
    applyGeom(win);
  }
  function focus(win) {
    for (const w of wins.values()) w.el.classList.remove("focused");
    win.el.classList.add("focused");
    win.el.style.zIndex = ++z;
    refreshTasks();
  }
  function refreshTasks() {
    for (const w of wins.values()) w.task.classList.toggle("active", w.el.classList.contains("focused") && !w.el.hidden);
  }
  function closeWindow(win) {
    sound.close();
    win.el.remove();
    win.task.remove();
    wins.delete(win.id);
  }

  // ---------------------------------------------------------------
  //  Applications
  // ---------------------------------------------------------------
  function openCategory(cat) {
    if (cat.type === "note") return openNote(cat.file, cat.content, cat.icon);
    if (cat.type === "contact") return openContact(cat);
    openExplorer("cat-" + cat.id, cat.label, cat.icon, cat);
  }
  function rootNode() {
    return { label: "Mon CV", icon: "computer", description: `Tous les dossiers de ${CV.owner.name}.`, items: CV.categories.map((c) => ({ ...c, file: c.file || c.label, isCat: true })) };
  }

  function openNote(file, content, icon = "doc") {
    openWindow({
      id: "note-" + file, title: file + " - Bloc-notes", icon, w: 520, hgt: 400,
      build(body) {
        body.append(menubar(["Fichier", "Édition", "Format", "Affichage", "?"]));
        const pre = h("div", "notepad", content);
        body.append(pre);
      },
    });
  }

  function openReadme() {
    openNote("LISEZMOI.txt",
`=== LISEZMOI.TXT ===

Bienvenue dans CV-OS 98 !

- Cliquez sur les icônes du bureau pour ouvrir
  les dossiers de mon CV.
- Dans un dossier, cliquez sur un fichier pour
  l'ouvrir. Le bouton « Précédent » vous ramène.
- Les fenêtres se déplacent en attrapant la
  barre de titre.
- Le menu « démarrer » contient tout le reste.
- « Quitter » (ou le bouton Retour) vous ramène
  dans la chambre, sans rien fermer.`);
  }

  function openPDF() {
    if (CV.owner.cvFile) {
      downloadCV(CV.owner.cvFile);
      dialog("Téléchargement", "Mon CV est en cours de téléchargement.\n\nMerci de votre intérêt !", "docBlue");
      return;
    }
    dialog("Information", "La version téléchargeable de mon CV arrive bientôt.\n\nEn attendant, tout est ici !", "computer");
  }

  function dialog(title, text, icon = "error") {
    const id = "dlg-" + Date.now();
    const win = openWindow({
      id, title, icon, w: 330, hgt: 170,
      build(body, win) {
        body.classList.add("dlg");
        const row = h("div", "dlg-row");
        row.append(iconImg(icon, 32), h("p", null, text));
        const ok = h("button", "btn", "OK");
        ok.addEventListener("click", () => closeWindow(win));
        body.append(row, ok);
        setTimeout(() => ok.focus(), 50);
      },
    });
    win.max = false;
    win.x = (VW - win.w) / 2;
    win.y = (VH - 30 - win.h) / 2;
    applyGeom(win);
    if (icon === "error") sound.error();
    else sound.ding();
  }

  function openContact(cat) {
    openWindow({
      id: "contact", title: "Carnet d'adresses - Contact", icon: cat.icon, w: 470, hgt: 330,
      build(body) {
        body.append(menubar(["Fichier", "Édition", "Affichage", "Outils", "?"]));
        const wrap = h("div", "contact");
        const head = h("div", "contact-head");
        head.append(iconImg("avatar", 48));
        const who = h("div");
        who.append(h("b", null, CV.owner.name), h("div", null, CV.owner.title));
        head.append(who);
        wrap.append(head);
        const list = h("div", "contact-list");
        cat.links.forEach((l) => {
          const row = h("div", "contact-row");
          row.append(h("span", "cl", l.label + " :"));
          // adresse e-mail protégée : affichée seulement quand le visiteur la demande
          const value = () => (l.email ? decodeEmail(l.email) : l.value);
          if (l.email) {
            const show = h("button", "reveal", "Afficher l'adresse");
            show.addEventListener("click", () => {
              sound.click();
              const a = h("a", null, value());
              a.href = "mailto:" + value();
              show.replaceWith(a);
            });
            row.append(show);
          } else {
            const a = h("a", null, l.value);
            a.href = l.href;
            if (/^https?:/.test(l.href)) { a.target = "_blank"; a.rel = "noopener"; }
            a.addEventListener("click", () => sound.click());
            row.append(a);
          }
          const cp = h("button", "btn small", "Copier");
          cp.addEventListener("click", async () => {
            try { await navigator.clipboard.writeText(value()); cp.textContent = "Copié !"; sound.ding(); }
            catch { cp.textContent = "Oups"; sound.error(); }
            setTimeout(() => (cp.textContent = "Copier"), 1500);
          });
          row.append(cp);
          list.append(row);
        });
        wrap.append(list);
        const mail = cat.links.find((l) => l.email);
        if (mail) {
          // l'adresse n'est reconstituée qu'au clic, pour ouvrir la messagerie
          const send = h("button", "btn big", "✉  Nouveau message");
          send.addEventListener("click", () => { sound.click(); location.href = "mailto:" + decodeEmail(mail.email); });
          wrap.append(send);
        }
        body.append(wrap);
      },
    });
  }

  // --- Explorateur de fichiers ---
  function openExplorer(id, title, icon, node) {
    openWindow({
      id, title, icon, w: 640, hgt: 470,
      build(body, win) {
        const history = [{ node, item: null }];
        // une seule barre compacte (navigation + adresse) : un maximum de place pour le contenu

        const toolbar = h("div", "toolbar");
        const back = h("button", "tbtn");
        back.innerHTML = `<span class="arrow back">◀</span> Précédent`;
        toolbar.append(back);

        const addr = h("div", "addr");
        const field = h("div", "field");
        addr.append(field);
        toolbar.append(addr);

        const main = h("div", "ex-body");
        const side = h("div", "side");
        const content = h("div", "content");
        main.append(side, content);
        const status = h("div", "status");
        body.append(toolbar, main, status);

        const go = (entry) => { history.push(entry); render(); };
        back.addEventListener("click", () => { if (history.length > 1) { sound.click(); history.pop(); render(); } });

        function render() {
          const { node: cur, item } = history[history.length - 1];
          back.disabled = history.length < 2;
          const path = history.map((e) => (e.item ? e.item.file : e.node.label));
          field.replaceChildren(iconImg(item ? item.icon || "doc" : cur.icon || "folder", 16), h("span", null, "C:\\" + path.join("\\")));
          win.titleEl.textContent = item ? item.file : cur.label;
          content.scrollTop = 0;
          main.classList.toggle("reading", !!item); // en lecture, le panneau latéral laisse toute la place au texte

          // panneau latéral
          side.replaceChildren();
          const p1 = panel("Tâches du dossier");
          const tasksList = h("div", "side-links");
          const l2 = h("button", null, "▸ Ouvrir le Lisez-moi");
          l2.addEventListener("click", () => { sound.click(); openReadme(); });
          tasksList.append(l2);
          p1.body.append(tasksList);
          const p2 = panel("Détails");
          if (item) {
            p2.body.append(h("b", null, item.file), h("div", null, item.date || "Document"));
          } else {
            p2.body.append(h("b", null, cur.label), h("div", null, cur.description || "Dossier de fichiers"));
          }
          side.append(p1.el, p2.el);

          if (item) {
            content.replaceChildren(docView(item, cur));
            status.textContent = "Document - " + item.file;
          } else if (cur.items.every((it) => !it.isCat && it.title)) {
            // dossier de documents : vue « détails », on lit le titre, l'employeur et les dates sans ouvrir
            const rows = h("div", "rows");
            cur.items.forEach((it) => {
              const b = h("button", "row");
              const txt = h("div");
              const sub = [it.org, it.date, it.place].filter(Boolean).join("  ·  ")
                || (it.tags ? it.tags.join(", ") : it.summary || (it.photos ? it.photos.map((p) => p.caption).join("  ·  ") : ""));
              txt.append(h("b", null, it.title));
              if (sub) txt.append(h("small", null, sub));
              b.append(iconImg(it.icon || "doc", 28), txt);
              b.addEventListener("click", () => { sound.click(); go({ node: cur, item: it }); });
              rows.append(b);
            });
            content.replaceChildren(rows);
            status.textContent = cur.items.length + " objet(s)";
          } else {
            const grid = h("div", "grid");
            cur.items.forEach((it) => {
              const b = h("button", "fitem");
              b.append(iconImg(it.isCat ? it.icon : it.icon || "doc", 32), h("span", null, it.isCat ? it.label : it.file));
              b.addEventListener("click", () => {
                sound.click();
                if (it.isCat) {
                  if (it.type === "folder") go({ node: it, item: null });
                  else openCategory(it);
                } else go({ node: cur, item: it });
              });
              grid.append(b);
            });
            content.replaceChildren(grid);
            status.textContent = cur.items.length + " objet(s)";
          }
        }
        render();
      },
    });
  }

  // Puce enrichie : l'intitulé avant « : » passe en gras, les chiffres clés sont surlignés
  const KEY_FIGURE = /((?:~|\b)\d[\d\u00a0 ]*\+?\s(?:postes|sites|utilisateurs|annonces|jours))/;
  function richLine(text) {
    const li = h("li");
    const m = text.match(/^(.{3,70}?)\s:\s([\s\S]+)$/);
    if (m) li.append(h("b", "lead", m[1]), document.createTextNode(" : "));
    (m ? m[2] : text).split(KEY_FIGURE).forEach((part, i) => {
      li.append(i % 2 ? h("mark", null, part) : document.createTextNode(part));
    });
    return li;
  }

  // Polaroids punaisés sur un fond bois, légèrement de travers ; un clic ouvre la photo en grand
  const TILT = [-5, 4, -2, 6, -4, 3], DROP = [0, 12, -4, 8, 2, -6], PINS = ["#d62828", "#1d6fe0", "#2a9d8f", "#f4a261"];
  function photoBoard(photos) {
    const board = h("div", "board");
    photos.forEach((p, i) => {
      const card = h("button", p.pano ? "polaroid pano" : "polaroid");
      card.style.setProperty("--r", TILT[i % TILT.length] + "deg");
      card.style.setProperty("--y", DROP[i % DROP.length] + "px");
      card.style.setProperty("--pin", PINS[i % PINS.length]);
      card.append(photoImg(p), h("span", null, p.caption));
      card.addEventListener("click", () => { sound.click(); openPhoto(p); });
      board.append(card);
    });
    return board;
  }

  // photo classique (réduite en douceur) ou pixel art (fichier `pixel: true` ou illustration en code) agrandi net
  function photoImg(p) {
    const img = h("img", p.img && !p.pixel ? "photo" : null);
    img.src = p.img || artURL(p.art);
    img.alt = p.caption;
    return img;
  }

  function openPhoto(p) {
    openWindow({
      id: "photo-" + (p.img || p.art), title: p.caption + ".bmp - Visionneuse", icon: "doc",
      // `wide` : photo en paysage (écoles) → fenêtre plus large que haute
      w: p.wide ? 580 : p.full ? 380 : 340, hgt: p.pano ? 300 : p.wide ? 480 : p.full ? 500 : 380,
      build(body) {
        const v = h("div", "viewer");
        // version nette de l'image si elle existe (affiche originale), sinon la même que le polaroid
        const img = p.full ? h("img", p.wide ? "photo full wide" : "photo full") : photoImg(p);
        if (p.full) { img.src = p.full; img.alt = p.caption; }
        v.append(img, h("div", "viewer-cap", p.caption));
        body.append(v);
      },
    });
  }

  // `folder` : dossier d'où la fiche est ouverte (son option `photosLast` place les photos après le contenu)
  function docView(it, folder) {
    const doc = h("article", "doc");
    const photosLast = Boolean(folder?.photosLast);
    const head = h("header", "doc-head");
    head.append(iconImg(it.icon || "doc", 32));
    const tt = h("div", "doc-tt");
    tt.append(h("h2", null, it.title));
    if (it.org) tt.append(h("div", "org", it.org));
    const chips = h("div", "chips");
    if (it.date) chips.append(h("span", "chip date", it.date));
    if (it.place) chips.append(h("span", "chip place", it.place));
    if (chips.children.length) tt.append(chips);
    head.append(tt);
    doc.append(head);

    if (it.summary || it.web) {
      const p = h("p", "summary", it.summary);
      if (it.web) {
        const a = h("a", null, it.web.url);
        a.href = it.web.url; a.target = "_blank"; a.rel = "noopener";
        a.addEventListener("click", () => sound.click());
        const line = h("span", "web");
        line.append(document.createTextNode(it.web.label + " : "), a);
        p.append(line);
      }
      doc.append(p);
    }
    if (it.photos?.length && !photosLast) doc.append(photoBoard(it.photos));
    if (it.bullets?.length) {
      const ul = h("ul");
      it.bullets.forEach((b) => ul.append(richLine(b)));
      doc.append(ul);
    }
    if (it.skills?.length) {
      it.skills.forEach(([name, lvl]) => {
        const row = h("div", "skill");
        row.append(h("span", null, name));
        const bar = h("div", "bar");
        for (let i = 1; i <= 5; i++) bar.append(h("i", i <= lvl ? "on" : ""));
        row.append(bar);
        doc.append(row);
      });
    }
    if (it.tags?.length) {
      // touches juste sous le titre (seul contenu, ou photos placées après) : pas besoin d'intitulé
      if (it.bullets?.length || it.summary || (it.photos?.length && !photosLast)) doc.append(h("div", "sec", "Outils & technos"));
      const tags = h("div", "tags");
      it.tags.forEach((t) => tags.append(h("span", null, t)));
      doc.append(tags);
    }
    if (it.photos?.length && photosLast) doc.append(photoBoard(it.photos));
    if (it.school) {
      // présentation de l'établissement, ses photos en dessous
      doc.append(h("div", "sec", "L'école : " + it.school.name));
      if (it.school.about) doc.append(h("p", "school", it.school.about));
      if (it.school.photos?.length) doc.append(photoBoard(it.school.photos));
    }
    if (it.link) {
      const a = h("a", "btn go", (it.linkLabel || "Voir le projet") + " ▸  " + it.link.replace(/^https?:\/\//, "").replace(/\/$/, ""));
      a.href = it.link; a.target = "_blank"; a.rel = "noopener";
      doc.append(a);
    }
    return doc;
  }

  function panel(title) {
    const el = h("div", "panel");
    const body = h("div", "panel-b");
    el.append(h("h4", null, title), body);
    return { el, body };
  }
  function menubar(items) {
    const m = h("div", "menubar");
    items.forEach((i) => m.append(h("span", null, i)));
    return m;
  }

  // le bureau est-il déjà affiché ? (on le retrouve tel quel en revenant au PC)
  const isRunning = () => !!desktop?.isConnected;
  return { layout, boot, isRunning };
}

export function downloadCV(href) {
  const a = document.createElement("a");
  a.href = href;
  a.download = href.split("/").pop();
  document.body.append(a);
  a.click();
  a.remove();
}

// adresse e-mail stockée en base64, écrite à l'envers (voir cv-data.js)
const decodeEmail = (s) => [...new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)))].reverse().join("");

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
