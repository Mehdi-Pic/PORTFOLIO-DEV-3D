import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import * as TX from "./textures.js";
import { sound } from "./sound.js";
import { createOS, downloadCV, osVirtualWidth } from "./os.js";
import { CV } from "./cv-data.js";
import { createCity } from "./city.js";

// ------------------------------------------------------------------
//  Éléments de la page
// ------------------------------------------------------------------
const $ = (s) => document.querySelector(s);
const canvas = $("#scene");
const loaderEl = $("#loader");
const introEl = $("#intro");
const tipEl = $("#tip");
const overlay = $("#screen-overlay");
const muteBtn = $("#btn-mute");
const questEl = $("#quest");
const QUEST_POS = new THREE.Vector3(0, 1.36, -2.5); // juste au-dessus du moniteur
questEl.addEventListener("click", () => powerOn());
const questPrintEl = $("#quest-print");
questPrintEl.addEventListener("click", () => printCV());
const PRINTER = /^Printer/;
const PRINT_QUEST_OFFSET = new THREE.Vector3(0, 0.36, 0); // au-dessus du bac à papier
$("#intro-name").textContent = CV.owner.name;
$("#intro-title").textContent = CV.owner.title;

// ------------------------------------------------------------------
//  Rendu : on dessine en basse résolution puis on agrandit sans
//  lissage → effet pixel art
// ------------------------------------------------------------------
// stencil : sert au contour des Blu-ray survolés
// preserveDrawingBuffer : sans lui, le navigateur (Edge/Chrome sous Windows) peut recomposer le canvas
// à partir d'un tampon déjà vidé (sous l'OS, en revenant d'un autre onglet…) : grands aplats noirs
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0b0a1a");
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 30);

const START_WIDE = { pos: new THREE.Vector3(3.5, 2.75, 3.3), target: new THREE.Vector3(-0.45, 0.95, -1.2) };
// en portrait : face au bureau, cadré pour garder dans l'écran tout ce qui est cliquable (affiche,
// étagère, PC, diplôme, imprimante) au-dessus de la carte d'intro
const START_TALL = { pos: new THREE.Vector3(1.8, 2.6, 1.9), target: new THREE.Vector3(0.7, 0.8, -1.6) };
const START = { pos: START_WIDE.pos.clone(), target: START_WIDE.target.clone() };
function updateStart() {
  const s = innerWidth / innerHeight < 0.9 ? START_TALL : START_WIDE;
  START.pos.copy(s.pos);
  START.target.copy(s.target);
}
updateStart();
const SCREEN = { center: new THREE.Vector3(0, 1.05, -2.385), w: 0.46, h: 0.345 };
// Rotation autour de la chambre (glisser avec la souris ou le doigt) : la caméra tourne à l'horizontale
// autour du point visé, sur 90° au plus, entre la vue face au mur du fond (0) et la vue face au mur de
// gauche (π/2). Au-delà on verrait l'extérieur des murs. null = angle de la vue de départ.
const ORBIT_MIN = 0, ORBIT_MAX = Math.PI / 2;
let orbitAngle = null;
function introPos(out) {
  const t = START.target, dx = START.pos.x - t.x, dz = START.pos.z - t.z;
  const a = orbitAngle ?? Math.atan2(dx, dz);
  const r = Math.hypot(dx, dz);
  return out.set(t.x + r * Math.sin(a), START.pos.y, t.z + r * Math.cos(a));
}
const camPos = START.pos.clone();
const camTarget = START.target.clone();
let state = "loading"; // loading | intro | zooming | desk | leaving
let PIX = 3;

// dégradé "toon" en 3 paliers : ombres franches façon pixel art
const gradientMap = new THREE.DataTexture(new Uint8Array([80, 140, 200, 255]), 4, 1, THREE.RedFormat);
gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;

// ------------------------------------------------------------------
//  Lumières (ambiance chambre de nuit)
// ------------------------------------------------------------------
scene.add(new THREE.AmbientLight("#7d87c9", 1.1));
const moon = new THREE.DirectionalLight("#8fa8ff", 1.2);
moon.position.set(-5, 4, 1);
scene.add(moon);
const fill = new THREE.DirectionalLight("#ffd9b0", 0.6);
fill.position.set(4, 5, 5);
scene.add(fill);
const lampLight = new THREE.PointLight("#ffc46b", 3, 4, 1.5);
scene.add(lampLight);
const screenLight = new THREE.PointLight("#7fb2ff", 1.5, 3, 1.5);
screenLight.position.copy(SCREEN.center).add(new THREE.Vector3(0, 0, 0.35));
scene.add(screenLight);

// ------------------------------------------------------------------
//  Chargement de la chambre (modélisée dans Blender)
// ------------------------------------------------------------------
// l'écran 3D montre les mêmes icônes que le vrai bureau
const screenFx = TX.createScreen(CV.categories.map((c) => ({ label: c.label, icon: c.icon })));
const named = {};
const pickables = [];
const NO_PICK = /^(Floor|Wall|Baseboard|Rug|Cable|Desk|Drawer|Screen$|ScreenFrame|WindowGlass|WindowFrame|PowerStrip)/;
let roomRoot = null;
let city = null; // ville de nuit derrière la vitre (parallaxe)
const PC_PARTS = /^(Monitor|Screen|Keyboard|KeyRow|Numpad|Tower|Mouse|PostIt|Sticker)/;

const TEXTURES = {
  Rug: TX.rugTex(),
};
// images collées sur des faces du modèle, reconnues par le nom du matériau Blender (UV exportées)
const IMAGE_MATS = {
  // Blu-ray : dos + tranche + jaquette dans une seule image qui s'enroule autour de l'arrondi du boîtier
  M_bluray_wrap: "assets/posters/bladerunner_bluray.webp",
  M_bluray_wrap_logan: "assets/posters/logan_bluray.webp",
  M_bluray_wrap_exmachina: "assets/posters/exmachina_bluray.webp",
  M_bluray_wrap_dune: "assets/posters/dune_bluray.webp",
  M_bluray_header: "assets/posters/bluray_header.webp", // bandeau noir brillant « 4K Ultra HD », commun aux boîtiers
};
// boîtiers Blu-ray : plastique et jaquette sous film glacé. Vernis (clearcoat) + reflet d'un
// environnement neutre réservé à ces matériaux : le reste de la chambre garde son rendu « toon »
const GLOSSY = /^M_bluray/;
let glossEnv = null;
const getGlossEnv = () => (glossEnv ??= new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture);
const glossy = (params) => new THREE.MeshPhysicalMaterial({
  ...params, roughness: 0.55, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, envMap: getGlossEnv(), envMapIntensity: 0.35,
});
// bois veiné, reconnu par le nom du matériau Blender (UV exportées avec le modèle)
const WOOD = {
  // veinage discret (tons proches) pour rester dans le style sobre de la chambre
  M_c08a52: TX.woodTex("#c08a52", "#b9844e", "#a97643", 3),  // chêne miel de la bibliothèque
  M_9a6a3c: TX.woodTex("#9a6a3c", "#946538", "#855a32", 8),  // lames du fond et panneaux, plus foncés
};
const EMISSIVE = /^(MonitorLED|TowerLED|LampBulb|SpeakerLED|PrinterLED)/;
// plastique du matériel informatique légèrement jauni, comme un PC des années 90
const AGED_PLASTIC = /^(Monitor|Keyboard|KeyRow|Numpad|Mouse(?!pad)|Tower|Printer(?!Paper)|Cable(Keyboard|Mouse))/;
const AGED_TINT = new THREE.Color("#ffefc6");
const AGED_LIGHT = "#e4dab8";
const AGED_KEYS = "#b3a67f";
const KEYBOARD_DIM = 0.7;
const RECOLOR = { PostIt1: "#ff8c2e" }; // post-it orange : le jaune se confondait avec le plastique jauni

// le câble de la souris (modélisé à même le bureau) traversait l'épaisseur du tapis :
// on relève la portion qui passe dessus, avec un raccord progressif au bord du tapis
function liftMouseCable() {
  const cable = named.CableMouse, pad = named.Mousepad;
  if (!cable?.isMesh || !pad) return;
  const box = new THREE.Box3().setFromObject(pad);
  const g = cable.geometry, p = g.attributes.position;
  const v = new THREE.Vector3(), inv = cable.matrixWorld.clone().invert();
  const EDGE = 0.02; // longueur du raccord hors du tapis
  let minY = Infinity;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(cable.matrixWorld);
    if (v.x >= box.min.x && v.x <= box.max.x && v.z >= box.min.z && v.z <= box.max.z) minY = Math.min(minY, v.y);
  }
  const lift = box.max.y + 0.0008 - minY;
  if (!(lift > 0)) return;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(cable.matrixWorld);
    const dx = Math.max(box.min.x - v.x, 0, v.x - box.max.x);
    const dz = Math.max(box.min.z - v.z, 0, v.z - box.max.z);
    const k = THREE.MathUtils.smoothstep(EDGE - Math.hypot(dx, dz), 0, EDGE);
    if (k <= 0) continue;
    v.y += lift * k;
    v.applyMatrix4(inv);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  p.needsUpdate = true;
  g.computeBoundingBox();
  g.computeBoundingSphere();
}

function planarUV(mesh, ax, ay, s) {
  const g = mesh.geometry;
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
    uv[i * 2] = v[ax] * s;
    uv[i * 2 + 1] = v[ay] * s;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

// UV 0→1 recalculées pour les plans (posters, écran…) d'après leur orientation
function fitUV(mesh, tex) {
  const g = mesh.geometry;
  const p = g.attributes.position;
  const pts = [];
  const box = new THREE.Box3();
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
    pts.push(v);
    box.expandByPoint(v);
  }
  const size = box.getSize(new THREE.Vector3());
  const thin = ["x", "y", "z"].reduce((a, b) => (size[a] <= size[b] ? a : b));
  // axes (u, v) selon la face : mur du fond, mur de gauche ou sol
  const [ua, us, va, vs] = thin === "z" ? ["x", 1, "y", 1] : thin === "x" ? ["z", -1, "y", 1] : ["x", 1, "z", -1];
  const uv = new Float32Array(p.count * 2);
  pts.forEach((v, i) => {
    const u = (v[ua] - box.min[ua]) / size[ua];
    const w = (v[va] - box.min[va]) / size[va];
    uv[i * 2] = us > 0 ? u : 1 - u;
    uv[i * 2 + 1] = vs > 0 ? w : 1 - w;
  });
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  tex.flipY = true;
  if (tex.image) tex.needsUpdate = true; // une image encore en chargement se mettra à jour seule
  return tex;
}

// figurine du Rathalos sur l'étagère murale, et son socle rocheux (modélisé et cuit dans Blender) :
// chargés en parallèle de la chambre
const figureP = new GLTFLoader().loadAsync("assets/figures/rathalos.glb");
const standP = new GLTFLoader().loadAsync("assets/figures/rathalos_base.glb");
const FIGURE = {
  // socle vers l'avant de la planche (z −2,99 → −2,75) : les ailes, ramenées vers l'arrière, arrivent juste au mur
  pos: new THREE.Vector3(-0.62, 1.765, -2.83), standScale: new THREE.Vector3(1.2, 1.2, 1.2),
  // dragon de 3/4 vers la caméra (tête vers les livres), un peu penché vers nous : les bouts d'ailes s'écartent du mur
  rotY: -0.175, tilt: 0.3, scale: 1.0875, light: 1.15,
  lift: 0.112,                                       // hauteur du dragon : queue et griffes juste au-dessus du rocher
  rodBase: new THREE.Vector3(-0.002, 0.1235, -0.002), // centre du sommet du pilier de roche (hauteur recalée sur le rocher)
  mount: new THREE.Vector3(0, 0.061, -0.007),        // dans le modèle : entre le bassin et la naissance de la queue, bout de la tige
  rockLight: 1.8,                                    // roche réaliste (non toon) : éclaircie pour la lumière de nuit
  rodSink: 0.006,                                    // la tige s'enfonce dans le rocher
};

// tige de présentoir en métal sombre, courte et droite, du rocher jusque dans le corps
function figureRod(from, to) {
  const mat = new THREE.MeshStandardMaterial({ color: "#34343a", metalness: 0.85, roughness: 0.3, envMap: getGlossEnv(), envMapIntensity: 0.9 });
  const rod = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(from.clone().setY(from.y - FIGURE.rodSink), to), 8, 0.0036, 16), mat);
  rod.name = "FigureRod";
  return rod;
}

// socle : rocher moussu (textures cuites), cailloux, herbes ; tige droite du sommet du pilier jusque sous le corps
function figureStand(stand, model) {
  const aniso = renderer.capabilities.getMaxAnisotropy();
  stand.traverse((o) => {
    if (!o.isMesh) return;
    for (const t of [o.material.map, o.material.normalMap]) if (t) t.anisotropy = aniso; // texture nette vue de biais
    if (o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace;
    o.material.color.multiplyScalar(FIGURE.rockLight);
    if (o.material.vertexColors) o.material.side = THREE.DoubleSide; // brins d'herbe : visibles des deux côtés
  });
  // socle mis à l'échelle, centré sur la planche
  stand.scale.copy(FIGURE.standScale);
  stand.updateMatrixWorld(true);
  // la tige part de la surface réelle du rocher
  const b = FIGURE.rodBase;
  const hit = new THREE.Raycaster(new THREE.Vector3(b.x, 1, b.z), new THREE.Vector3(0, -1, 0))
    .intersectObject(stand.getObjectByName("Rocks") || stand, true)[0]; // pas les brins d'herbe
  const base = new THREE.Vector3(b.x, hit ? hit.point.y : b.y, b.z);
  // bout de la tige dans le corps, juste au-dessus du pilier
  model.updateMatrixWorld(true);
  const rod = figureRod(base, FIGURE.mount.clone().applyMatrix4(model.matrixWorld));
  const group = new THREE.Group();
  group.add(stand, rod);
  group.traverse((o) => o.isMesh && pickables.push(o));
  return group;
}

function addFigure([gltf, stand]) {
  const model = gltf.scene; // pose en vol (ailes, tête, pattes, queue) figée dans Blender à l'export
  model.traverse((o) => {
    if (!o.isMesh) return;
    const s = o.material;
    if (s.map) s.map.colorSpace = THREE.SRGBColorSpace;
    o.material = new THREE.MeshToonMaterial({
      map: s.map, gradientMap,
      color: new THREE.Color().setScalar(FIGURE.light), // textures sombres : éclaircies pour rester lisibles en petit
      alphaTest: s.transparent || s.alphaTest > 0 ? 0.5 : 0, side: THREE.DoubleSide, // bords d'ailes découpés
    });
    pickables.push(o);
  });
  // dragon tourné sur lui-même et penché vers nous, le point d'attache pile au-dessus du sommet du pilier
  model.scale.setScalar(FIGURE.scale);
  model.rotation.set(FIGURE.tilt, FIGURE.rotY, 0, "YXZ");
  const m = FIGURE.mount.clone().multiplyScalar(FIGURE.scale).applyEuler(model.rotation);
  model.position.set(FIGURE.rodBase.x - m.x, FIGURE.lift, FIGURE.rodBase.z - m.z);
  const fig = new THREE.Group();
  fig.name = "ShelfFigure";
  fig.add(figureStand(stand.scene, model), model);
  fig.position.copy(FIGURE.pos);
  roomRoot.add(fig);
}

// taille réelle de assets/room.glb (à mettre à jour si le modèle change beaucoup)
const ROOM_BYTES = 1_795_992;
let loadPct = 0;
// Sous le plateau du bureau (caisson, tiroirs, pieds, panneau du fond) : la lampe et la lueur de l'écran
// sont au-dessus du plateau, qui devrait les cacher. La scène n'ayant pas d'ombres, ces deux lumières
// éclairaient quand même ces pièces : taches claires, reflets bleutés et paliers « toon » qui sautent.
// On leur retire donc les lumières ponctuelles (restent l'ambiance, la lune et la lumière d'appoint).
const UNDER_DESK = /^(DeskDrawers|Drawer\d|DrawerKnob\d|DeskLeg\d|DeskBackPanel)$/;
const NO_POINT_LIGHTS = /#if \( NUM_POINT_LIGHTS > 0 \) && defined\( RE_Direct \)[\s\S]*?#pragma unroll_loop_end\s*#endif/;
function withoutPointLights(mat) {
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <lights_fragment_begin>",
      THREE.ShaderChunk.lights_fragment_begin.replace(NO_POINT_LIGHTS, "")
    );
  };
  mat.customProgramCacheKey = () => "without-point-lights";
}

new GLTFLoader().load(
  "assets/room.glb",
  (gltf) => {
    const room = gltf.scene;
    roomRoot = room;
    scene.add(room);
    room.updateMatrixWorld(true);
    room.traverse((o) => {
      named[o.name] = o;
      if (!o.isMesh) return;
      const src = o.material;
      const color = src.color ? src.color.clone() : new THREE.Color("#fff");
      if (RECOLOR[o.name]) color.set(RECOLOR[o.name]);
      if (AGED_PLASTIC.test(o.name) && !EMISSIVE.test(o.name)) {
        // pièces presque blanches (touches du clavier, capot de l'imprimante) : ramenées au crème du boîtier
        // les touches, sous la lampe, sont plus sombres que le boîtier : contraste sans éblouir
        if (color.getHSL({}, THREE.SRGBColorSpace).l > 0.8) color.set(/^Keyboard/.test(o.name) ? AGED_KEYS : AGED_LIGHT);
        color.multiply(AGED_TINT);
        // clavier en pleine lumière de la lampe : tout le plastique un ton plus bas (pas la LED, saturée)
        if (/^Keyboard/.test(o.name) && color.getHSL({}).s < 0.6) color.multiplyScalar(KEYBOARD_DIM);
      }
      let mat;
      if (o.name === "Screen") {
        mat = new THREE.MeshBasicMaterial({ map: fitUV(o, screenFx.texture) });
      } else if (o.name === "Diploma") {
        // vraie photo du diplôme : filtrage lissé pour qu'il reste lisible au zoom
        const tex = new THREE.TextureLoader().load("assets/diplome.jpg");
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        mat = new THREE.MeshBasicMaterial({ map: fitUV(o, tex), color: "#d6d6d6" });
      } else if (o.name === "NotebookPages") {
        mat = new THREE.MeshLambertMaterial({ map: TX.notebookTex() });
      } else if (o.name === "PosterSamurai") {
        const tex = new THREE.TextureLoader().load("assets/poster_sept_samourais.webp");
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        mat = new THREE.MeshToonMaterial({ map: fitUV(o, tex), gradientMap });
      } else if (o.name.startsWith("SpeakerGrille")) {
        mat = new THREE.MeshToonMaterial({ map: fitUV(o, TX.speakerGrilleTex()), gradientMap });
      } else if (o.name === "TrashBinMesh") {
        // paroi grillagée : texture de losanges, on voit à travers
        // découpe nette (alphaTest) plutôt qu'un fondu : fils pleins, trous vides
        mat = new THREE.MeshLambertMaterial({ map: TX.wireMeshTex(), alphaTest: 0.3, side: THREE.DoubleSide });
      } else if (o.name === "WindowGlass") {
        city = createCity(o, START.pos);
        mat = city.material;
      } else if (EMISSIVE.test(o.name)) {
        mat = new THREE.MeshBasicMaterial({ color });
      } else if (IMAGE_MATS[src.name] && o.geometry.attributes.uv) {
        const tex = new THREE.TextureLoader().load(IMAGE_MATS[src.name]);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = false; // UV exportées depuis Blender (glTF)
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        mat = GLOSSY.test(src.name) ? glossy({ map: tex }) : new THREE.MeshToonMaterial({ map: tex, gradientMap });
      } else if (GLOSSY.test(src.name)) {
        mat = glossy({ color });
      } else if (WOOD[src.name] && o.geometry.attributes.uv) {
        mat = new THREE.MeshToonMaterial({ map: WOOD[src.name], gradientMap });
      } else if (TEXTURES[o.name]) {
        mat = new THREE.MeshToonMaterial({ map: fitUV(o, TEXTURES[o.name]), gradientMap });
      } else if (o.name === "Floor") {
        planarUV(o, "x", "z", 0.6); // lames plus grandes = sol moins chargé
        mat = new THREE.MeshToonMaterial({ map: TX.floorTex(), gradientMap });
      } else if (o.name === "WallBack") {
        planarUV(o, "x", "y", 2);
        mat = new THREE.MeshToonMaterial({ map: TX.wallTex("#3d5a80", "#34507a", "#5a7aa6"), gradientMap });
      } else if (o.name === "WallLeft") {
        planarUV(o, "z", "y", 2);
        mat = new THREE.MeshToonMaterial({ map: TX.wallTex("#34506f", "#2d4766", "#4d6a90"), gradientMap });
      } else {
        mat = new THREE.MeshToonMaterial({ color, gradientMap });
      }
      if (UNDER_DESK.test(o.name)) withoutPointLights(mat);
      o.material = mat;
      if (!NO_PICK.test(o.name)) pickables.push(o);
    });
    if (named.Diploma) addDiplomaGlint();
    liftMouseCable();
    setupBlurays();
    Promise.all([figureP, standP]).then(addFigure, (e) => console.warn("figurine :", e)).then(() => {
      setupRoomHalos();
      // la figurine se sort de l'étagère comme les Blu-ray (même halo que celui de l'étagère)
      const fig = roomRoot.getObjectByName("ShelfFigure");
      if (fig) blurays.push(fig);
    });
    if (named.LampLight) named.LampLight.getWorldPosition(lampLight.position);

    $(".ld-fill").style.width = "100%";
    $(".ld-pct").textContent = "100%";
    loaderEl.classList.add("done");
    setTimeout(() => loaderEl.remove(), 600);
    state = "intro";
    introEl.hidden = false;
  },
  (e) => {
    // Un hébergeur qui compresse (gzip, ex. GitHub Pages) annonce la taille compressée alors que
    // `loaded` compte les octets décompressés : on prend la taille réelle du modèle comme minimum,
    // et la barre ne recule jamais ni ne dépasse 99 % avant la fin
    const total = Math.max(e.total || 0, ROOM_BYTES);
    loadPct = Math.max(loadPct, Math.min(99, Math.round((e.loaded / total) * 100)));
    $(".ld-fill").style.width = loadPct + "%";
    $(".ld-pct").textContent = loadPct + "%";
  },
  (err) => {
    console.error(err);
    $(".ld-title").textContent = "ERREUR DE CHARGEMENT";
  }
);

// ------------------------------------------------------------------
//  Caméra
// ------------------------------------------------------------------
function baseFov() {
  const a = innerWidth / innerHeight;
  if (a >= 1.3) return 40;
  // écran vertical : on élargit le champ pour garder toute la chambre
  const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(20)) * 1.5);
  return Math.min(90, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hf / 2) / a)));
}

function deskPose() {
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const th = tv * camera.aspect;
  const small = innerWidth < 700;
  // part de la hauteur occupée par l'écran : sur un écran large c'est elle qui fixe le zoom,
  // on laisse donc de la place en bas pour voir le clavier
  const fh = small ? 0.8 : 0.62;
  const fw = small ? 0.9 : 0.72;
  const d = Math.max(SCREEN.h / (2 * fh * tv), SCREEN.w / (2 * fw * th));
  // caméra et cible descendues ensemble (sans inclinaison, l'écran reste bien rectangulaire
  // pour l'OS superposé) : le moniteur remonte un peu dans le cadre et le clavier apparaît
  const down = new THREE.Vector3(0, -(small ? 0 : 0.06) * 2 * d * tv, 0);
  return { pos: SCREEN.center.clone().add(new THREE.Vector3(0, 0, d)).add(down), target: SCREEN.center.clone().add(down) };
}

function applyCam() {
  camera.position.copy(camPos);
  camera.lookAt(camTarget);
  camera.updateMatrixWorld();
}

let tween = null;
function flyTo(pos, target, dur, done, arc = 0.25) {
  tween = { p0: camPos.clone(), t0: camTarget.clone(), p1: pos, t1: target, dur, el: 0, done, arc };
}
function stepTween(dt) {
  tween.el += dt;
  const k = Math.min(1, tween.el / tween.dur);
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  camPos.lerpVectors(tween.p0, tween.p1, e);
  camPos.y += Math.sin(Math.PI * e) * tween.arc;
  camTarget.lerpVectors(tween.t0, tween.t1, e);
  if (k >= 1) {
    const d = tween.done;
    tween = null;
    d && d();
  }
}

// ------------------------------------------------------------------
//  Écran HTML superposé exactement sur l'écran 3D
// ------------------------------------------------------------------
const os = createOS($("#os"), CV, sound, { onQuit: () => leavePC() });

function placeOverlay() {
  const c = SCREEN.center;
  const tl = new THREE.Vector3(c.x - SCREEN.w / 2, c.y + SCREEN.h / 2, c.z).project(camera);
  const br = new THREE.Vector3(c.x + SCREEN.w / 2, c.y - SCREEN.h / 2, c.z).project(camera);
  // calé sur le canvas tel qu'il est réellement affiché (et non sur innerWidth/innerHeight) :
  // l'OS reste collé à l'écran 3D même si le navigateur mobile redimensionne la page à sa façon
  const r = canvas.getBoundingClientRect();
  const x0 = r.left + ((tl.x + 1) / 2) * r.width, y0 = r.top + ((1 - tl.y) / 2) * r.height;
  const x1 = r.left + ((br.x + 1) / 2) * r.width, y1 = r.top + ((1 - br.y) / 2) * r.height;
  // 1 px de marge de chaque côté pour couvrir l'arrondi des gros pixels de la scène 3D
  const m = 1;
  Object.assign(overlay.style, { left: x0 - m + "px", top: y0 - m + "px", width: x1 - x0 + 2 * m + "px", height: y1 - y0 + 2 * m + "px" });
  os.layout(x1 - x0 + 2 * m, y1 - y0 + 2 * m);
}

let viewW = 0, viewH = 0; // dernière taille de fenêtre appliquée
function resize() {
  const w = innerWidth, hh = innerHeight;
  viewW = w;
  viewH = hh;
  // taille d'un "gros pixel" : léger effet pixel art, sans trop sacrifier la lisibilité
  // devant le diplôme on rend en pleine résolution pour que le texte soit lisible
  PIX = sharpView ? 1 : w < 700 ? 1.5 : Math.max(2, Math.round(Math.min(w, hh * 1.7) / 800));
  renderer.setSize(Math.ceil(w / PIX), Math.ceil(hh / PIX), false);
  // taille affichée = exactement celle utilisée pour la caméra et l'OS superposé. En CSS, 100vh vaut
  // sur mobile la hauteur SANS barre d'adresse : la scène était étirée et l'OS décalé par rapport à l'écran 3D
  for (const c of [canvas, $("#scene-still")]) {
    c.style.width = w + "px";
    c.style.height = hh + "px";
  }
  // proportions de l'image réellement affichée : la scène ne peut pas être étirée
  const shown = canvas.getBoundingClientRect();
  camera.aspect = shown.width && shown.height ? shown.width / shown.height : w / hh;
  camera.fov = baseFov();
  updateStart();
  camera.updateProjectionMatrix();
  // largeur qu'aura l'écran une fois devant le PC → même bureau dans la texture 3D que dans l'OS HTML,
  // pour qu'il n'y ait aucun saut au moment où l'OS prend le relais
  const deskD = deskPose().pos.z - SCREEN.center.z;
  const deskScreenW = (SCREEN.w / (2 * deskD * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect)) * (shown.width || w);
  screenFx.setLayout(osVirtualWidth(deskScreenW + 2));
  if (state === "desk" || CLOSEUPS[state] || state === "bluray") {
    const p = state === "desk" ? deskPose() : closeupPose(CLOSEUPS[state] || SHELF);
    camPos.copy(p.pos);
    camTarget.copy(p.target);
    applyCam();
    if (state === "desk") {
      placeOverlay();
      // la photo figée n'est plus à la bonne taille : retour à la vraie scène, puis nouvelle photo
      unfreezeScene();
      clearTimeout(freezeTimer);
      freezeTimer = setTimeout(freezeScene, 300);
    }
  }
}

// ------------------------------------------------------------------
//  Zoom sur le diplôme accroché au mur
// ------------------------------------------------------------------
let sharpView = false;
// centre lu dans le modèle au chargement ; le diplôme est sur le mur du fond, face à +z
const DIPLOMA = { center: new THREE.Vector3(1.35, 1.85, -2.955), normal: new THREE.Vector3(0, 0, 1), w: 0.78, h: 0.58, fill: 0.8 };
// étagère murale au-dessus du bureau (livres, Blu-ray, figurine du Rathalos), vue un peu d'en haut et de la droite (la jaquette du Blu-ray regarde vers la droite)
const SHELF = { center: new THREE.Vector3(-0.86, 1.98, -2.87), normal: new THREE.Vector3(0.35, 0.25, 1).normalize(), w: 1.22, h: 0.6, fill: 0.9 }; // inclut la figurine et ses ailes
const WALL_SHELF = /^(Shelf|ShelfBooks|ShelfBracket\d|ShelfFigure)$/;
// vues rapprochées : l'état de la caméra porte le nom de la vue
// affiche des Sept Samouraïs, sur le mur du fond (face à +z)
const POSTER = { center: new THREE.Vector3(-2.02, 1.55, -2.99), normal: new THREE.Vector3(0, 0, 1), w: 0.51, h: 0.72, fill: 0.8 };
const CLOSEUPS = { diploma: DIPLOMA, shelf: SHELF, poster: POSTER };
// titre écrit en haut de l'écran pendant une vue rapprochée
const CLOSEUP_TITLES = { poster: "Les Sept Samouraïs, Akira Kurosawa (1954)" };
const closeupTitle = $("#closeup-title");
const backBtn = $("#btn-back");

function closeupPose(v) {
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const th = tv * camera.aspect;
  const d = Math.max(v.h / (2 * v.fill * tv), v.w / (2 * v.fill * th));
  return { pos: v.center.clone().addScaledVector(v.normal, d), target: v.center.clone() };
}

// Reflet lumineux qui balaie la vitre du cadre de temps en temps :
// indice discret que le diplôme est interactif
let glint = null;
let diplomaHover = false;
function addDiplomaGlint() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  for (let y = 0; y < 64; y++) {
    const x0 = 18 + y * 0.45; // bande diagonale, jamais sur les bords (texture "clampée")
    const grad = g.createLinearGradient(x0 - 9, 0, x0 + 9, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(255,250,230,0.85)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(x0 - 9, y, 18, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  glint = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 0.58),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 })
  );
  named.Diploma.getWorldPosition(DIPLOMA.center);
  glint.position.copy(DIPLOMA.center).addScaledVector(DIPLOMA.normal, 0.004);
  scene.add(glint);
}
function updateDiplomaCue(t) {
  if (!glint) return;
  // un passage toutes les 6 s (toutes les 1,6 s quand la souris est dessus)
  const period = diplomaHover ? 1.6 : 6;
  const k = (t % period) / 1.1;
  glint.visible = state === "intro" && k < 1;
  glint.material.map.offset.x = 0.9 - k * 1.8;
  // papier un peu dans la pénombre dans la chambre, bien éclairé une fois zoomé
  named.Diploma.material.color.set(state === "diploma" ? "#ececec" : "#b8b8b8");
}

function viewCloseup(kind) {
  if (state !== "intro") return;
  sound.unlock();
  sound.open();
  state = "zooming";
  introEl.hidden = true;
  hideTip();
  const p = closeupPose(CLOSEUPS[kind]);
  flyTo(p.pos, p.target, 1.8, () => {
    state = kind;
    sharpView = true;
    resize();
    backBtn.hidden = false;
    if (CLOSEUP_TITLES[kind]) {
      closeupTitle.textContent = CLOSEUP_TITLES[kind];
      closeupTitle.hidden = false;
    }
  }, 0.1);
}

function leaveCloseup() {
  if (!CLOSEUPS[state]) return;
  setBrHover(null);
  closeupTitle.hidden = true;
  sound.close();
  backBtn.hidden = true;
  sharpView = false;
  state = "zooming";
  resize();
  flyTo(introPos(new THREE.Vector3()), START.target.clone(), 1.8, () => {
    state = "intro";
    introEl.hidden = false;
  }, 0.1);
}
// même bouton « Retour » devant le diplôme, l'étagère et le PC
backBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (state === "desk") leavePC();
  else if (state === "bluray") putBackBluray();
  else leaveCloseup();
});
// Échap = « Retour » : quitte le PC (l'OS est retrouvé tel quel en revenant), range l'objet
// inspecté ou quitte la vue rapprochée
addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (state === "desk") leavePC();
  else if (state === "bluray") putBackBluray();
  else leaveCloseup();
});
addEventListener("resize", resize);
resize();

// ------------------------------------------------------------------
//  Allumer / éteindre le PC
// ------------------------------------------------------------------
// Le PC reste toujours allumé : on s'y installe, puis on le « quitte » sans rien fermer
const startBtn = $("#btn-start");
startBtn.textContent = "Utiliser le PC";
$("#intro-action").textContent = "▶ Cliquez sur le PC pour démarrer";

function powerOn() {
  if (state !== "intro") return;
  sound.unlock();
  sound.click();
  state = "zooming";
  introEl.hidden = true;
  hideTip();
  const p = deskPose();
  flyTo(p.pos, p.target, 2.6, () => {
    state = "desk";
    // pose finale exacte (la boucle n'applique plus la caméra une fois installé devant le PC)
    camPos.copy(p.pos);
    camTarget.copy(p.target);
    applyCam();
    // la photo figée de la chambre d'abord, l'OS ensuite : jamais d'OS par-dessus le canvas WebGL
    freezeScene(() => {
      overlay.hidden = false;
      overlay.classList.remove("fade-out");
      overlay.classList.add("fade-in");
      placeOverlay();
      // première visite : on affiche le bureau ; ensuite on le retrouve tel qu'on l'a laissé
      if (!os.isRunning()) os.boot({ desktopOnly: true });
      backBtn.hidden = false;
    });
  });
}

// Devant le PC, la chambre ne bouge plus : on la remplace par une photo figée (simple image) et on
// arrête le rendu WebGL. Sous Edge/Chrome (Windows), à chaque changement dans l'OS superposé (survol
// d'une icône, fenêtre…) le navigateur recompose la zone voisine et pouvait la laisser sans l'image du
// canvas WebGL : scintillements et grands aplats noirs autour de l'écran. Une image statique n'a pas ce défaut.
const still = $("#scene-still");
let frozen = false, freezeTimer = 0;
// copie immédiate du canvas WebGL dans un canvas 2D (aucun encodage d'image) : l'OS apparaît sans délai
function freezeScene(then) {
  if (state !== "desk" || frozen) return then?.();
  // l'écran 3D reste allumé sur la photo (même bureau que l'OS) : le fondu d'apparition de l'OS
  // se fait sans passage par un écran éteint
  renderer.render(scene, camera);
  still.width = canvas.width;
  still.height = canvas.height;
  still.getContext("2d").drawImage(canvas, 0, 0);
  still.hidden = false;
  canvas.style.visibility = "hidden";
  frozen = true;
  then?.();
}
function unfreezeScene() {
  clearTimeout(freezeTimer);
  frozen = false;
  canvas.style.visibility = "";
  still.hidden = true;
}

function leavePC() {
  if (state !== "desk") return;
  sound.close();
  backBtn.hidden = true;
  state = "leaving";
  screenFx.setMode("idle", clock.elapsedTime);
  overlay.classList.remove("fade-in");
  overlay.classList.add("fade-out");
  // la photo figée reste le temps que l'OS disparaisse, puis on repasse sur la vraie scène
  setTimeout(() => {
    overlay.hidden = true;
    unfreezeScene();
    flyTo(introPos(new THREE.Vector3()), START.target.clone(), 2.2, () => {
      state = "intro";
      introEl.hidden = false;
    });
  }, 250);
}

startBtn.addEventListener("click", (e) => { e.stopPropagation(); powerOn(); });

const refreshMute = () => { muteBtn.textContent = sound.muted ? "SON : OFF" : "SON : ON"; };
refreshMute();
muteBtn.addEventListener("click", () => { sound.unlock(); sound.toggle(); refreshMute(); document.dispatchEvent(new CustomEvent("cv-sound")); });
document.addEventListener("cv-sound", refreshMute);

// ------------------------------------------------------------------
//  Interactions dans la chambre : survol + clic sur les objets
// ------------------------------------------------------------------
// [objet, nom affiché, action (ligne du dessous, plus discrète)]
const TIPS = [
  [PC_PARTS, "Le PC", "Cliquez pour l'allumer"],
  [/^Printer/, "L'imprimante", "Cliquez pour imprimer mon CV"],
  [/^PrintedCV/, "Mon CV tout juste imprimé", "Cliquez pour le télécharger"],
  [/^Diploma/, "Mon diplôme", "Cliquez pour le voir de près"],
  [WALL_SHELF, "Mon étagère", "Cliquez pour la voir de près"],
  [/^PosterSamurai/, "Les Sept Samouraïs", "Cliquez pour la voir de près"],
]; // objets interactifs + l'affiche du film ; le reste du décor reste silencieux
const tipFor = (name) => TIPS.find(([re]) => re.test(name))?.slice(1);

const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const parallax = new THREE.Vector2();
let hovered = null;

// Objet survolé → remonte jusqu'au groupe (chaise, lit, lampe…) pour le traiter d'un bloc
function pick(e) {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  let obj = ray.intersectObjects(pickables, false)[0]?.object || null;
  while (obj && obj.parent && obj.parent !== roomRoot && obj.parent !== scene) obj = obj.parent;
  return obj;
}
function hideTip() { tipEl.hidden = true; document.body.style.cursor = ""; hovered = null; diplomaHover = false; setRoomHalo(null); }

// Glisser dans la chambre (souris ou doigt) : tourne la vue autour de la chambre, dans les limites de
// ORBIT_MIN / ORBIT_MAX. Un vrai glissé (plus de quelques pixels) n'est pas compté comme un clic.
let orbitDrag = null;
let suppressClick = false;
canvas.addEventListener("pointerdown", (e) => {
  suppressClick = false;
  if (state !== "intro" || e.button > 0) return;
  orbitDrag = { id: e.pointerId, x0: e.clientX, x: e.clientX, moved: false };
  try { canvas.setPointerCapture(e.pointerId); } catch {} // le glissé continue même si le doigt sort du canvas
});
canvas.addEventListener("pointermove", (e) => {
  const d = orbitDrag;
  if (!d || e.pointerId !== d.id) return;
  if (!d.moved && Math.abs(e.clientX - d.x0) > 6) {
    d.moved = true;
    hideTip();
    document.body.style.cursor = "grabbing";
  }
  if (d.moved && state === "intro") {
    // un demi-écran de glissé = 90° : de la vue face au mur du fond à la vue face au mur de gauche
    const start = orbitAngle ?? Math.atan2(START.pos.x - START.target.x, START.pos.z - START.target.z);
    const k = Math.PI / Math.max(innerWidth, 600);
    orbitAngle = THREE.MathUtils.clamp(start + (e.clientX - d.x) * k, ORBIT_MIN, ORBIT_MAX);
  }
  d.x = e.clientX;
});
const endOrbitDrag = (e) => {
  const d = orbitDrag;
  if (!d || e.pointerId !== d.id) return;
  orbitDrag = null;
  if (d.moved) {
    suppressClick = true; // le clic qui suit le relâcher n'active pas l'objet sous le curseur
    document.body.style.cursor = "";
  }
};
canvas.addEventListener("pointerup", endOrbitDrag);
canvas.addEventListener("pointercancel", endOrbitDrag);

addEventListener("pointermove", (e) => {
  // bornée : pendant un glissé (pointeur capturé), la souris peut sortir de la fenêtre
  parallax.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1).clampScalar(-1, 1);
  if (orbitDrag?.moved) return; // pas de bulle ni de halo pendant qu'on fait tourner la vue
  // vue de l'étagère : halo et bulle sur le Blu-ray survolé
  if (state === "shelf") {
    const b = e.target === canvas ? pickBluray(e) : null;
    setBrHover(b);
    if (b) showTip(e, BR_TITLES[b.name], "Cliquez pour le sortir");
    else tipEl.hidden = true;
    return;
  }
  if (state !== "intro" || e.target !== canvas) { if (state === "intro") hideTip(); return; }
  const obj = pick(e);
  const tip = obj && tipFor(obj.name);
  if (!tip) {
    hideTip();
    document.body.style.cursor = "grab"; // rien à cliquer ici : on peut faire glisser pour tourner
    return;
  }
  hovered = obj;
  showTip(e, ...tip);
  // seul le PC est cliquable, les autres objets affichent juste leur bulle
  diplomaHover = /^Diploma/.test(obj.name);
  const posterHover = obj.name === "PosterSamurai";
  setRoomHalo(obj);
  const clickable = PC_PARTS.test(obj.name) || diplomaHover || posterHover || WALL_SHELF.test(obj.name) || PRINTER.test(obj.name) || obj.name === "PrintedCV";
  document.body.style.cursor = clickable ? "pointer" : "";
});

canvas.addEventListener("click", (e) => {
  sound.unlock();
  if (suppressClick) { suppressClick = false; return; } // fin d'un glissé, pas un clic
  if (state === "bluray") return;   // géré par le glisser / relâcher de l'inspection
  if (state === "shelf") {
    const b = pickBluray(e);
    return b ? inspectBluray(b) : leaveCloseup();
  }
  if (CLOSEUPS[state]) return leaveCloseup();
  if (state !== "intro") return;
  const obj = pick(e);
  if (obj && PC_PARTS.test(obj.name)) powerOn();
  else if (obj && /^Diploma/.test(obj.name)) viewCloseup("diploma");
  else if (obj && WALL_SHELF.test(obj.name)) viewCloseup("shelf");
  else if (obj && obj.name === "PosterSamurai") viewCloseup("poster");
  else if (obj && PRINTER.test(obj.name)) printCV();
  else if (obj && obj.name === "PrintedCV") { sound.click(); downloadCV(CV.owner.cvFile); }
});

// ------------------------------------------------------------------
//  Blu-ray de l'étagère : halo au survol, sortie de l'étagère,
//  puis inspection en grand, à tourner en le faisant glisser
// ------------------------------------------------------------------
const BR_TITLES = {
  BluRayBladeRunner: "Blade Runner : The Final Cut",
  BluRayLogan: "Logan",
  BluRayExMachina: "Ex Machina",
  BluRayDune: "Dune + Dune : Deuxième partie",
  ShelfFigure: "Figurine de Rathalos (Monster Hunter Wilds)",
};
// bandeau affiché en haut pendant l'inspection d'un objet sorti de l'étagère (comme pour l'affiche)
const INSPECT_TITLES = {
  BluRayBladeRunner: "Blade Runner : The Final Cut, Ridley Scott (1982)",
  BluRayLogan: "Logan, James Mangold (2017)",
  BluRayExMachina: "Ex Machina, Alex Garland (2014)",
  BluRayDune: "Dune + Dune : Deuxième partie, Denis Villeneuve (2021 et 2024)",
  ShelfFigure: "Figurine de Rathalos (Monster Hunter Wilds)",
};
const blurays = [];
let brHover = null;
const insp = {
  obj: null, parent: null, size: 0,
  cLocal: new THREE.Vector3(),                         // centre du boîtier dans son propre repère
  c0: new THREE.Vector3(), q0: new THREE.Quaternion(), // place d'origine sur l'étagère
  c: new THREE.Vector3(), q: new THREE.Quaternion(),   // pose courante (centre + orientation)
  anim: null, drag: null, spin: new THREE.Vector2(),
};
const PULL = new THREE.Vector3(0, 0.012, 0.17);        // on tire le boîtier vers la chambre (+z)

// bulle : nom de l'objet sur une ligne, action en dessous (plus petite, atténuée)
function showTip(e, name, hint) {
  tipEl.hidden = false;
  const n = document.createElement("b");
  n.className = "tip-name";
  n.textContent = name;
  tipEl.replaceChildren(n);
  if (hint) {
    const h = document.createElement("span");
    h.className = "tip-hint";
    h.textContent = hint;
    tipEl.append(h);
  }
  tipEl.style.left = Math.min(e.clientX + 14, innerWidth - tipEl.offsetWidth - 8) + "px";
  tipEl.style.top = e.clientY + 16 + "px";
}

// Halo de survol (Blu-ray, affiche, diplôme) : contour blanc d'épaisseur fixe à l'écran, dessiné
// par-dessus tout. 1) un masque invisible marque la silhouette de l'objet dans le stencil ;
// 2) une copie élargie à l'écran depuis le centre de l'objet est dessinée partout SAUF dans ce masque.
// L'élargissement depuis le centre marche aussi pour les objets plats (affiche vue de face).
const haloRes = new THREE.Vector2(1, 1);
const HALO_VS = /* glsl */ `
  uniform vec2 uRes;
  uniform float uPx;
  uniform vec3 uCenter;
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec4 cc = projectionMatrix * modelViewMatrix * vec4(uCenter, 1.0);
    vec2 d = (clip.xy / clip.w - cc.xy / cc.w) * uRes;
    if (dot(d, d) > 1e-6) clip.xy += normalize(d) / uRes * 2.0 * uPx * clip.w;
    gl_Position = clip;
  }`;
const HALO_FS = /* glsl */ `
  uniform float uAlpha;
  void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, uAlpha); }`;
const haloMask = new THREE.MeshBasicMaterial({
  colorWrite: false, depthTest: false, depthWrite: false,
  stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
});
const HALO_RINGS = [[2.5, 1.0], [6, 0.35]]; // contour net + lueur douce (en pixels de rendu)

function makeHalo(target, { sharedCenter = false } = {}) {
  target.updateMatrixWorld(true);
  const box = new THREE.Box3();
  target.traverse((m) => { if (m.isMesh && !m.userData.isHalo) box.expandByObject(m); });
  const center = box.getCenter(new THREE.Vector3());
  const parts = [];
  target.traverse((m) => {
    if (!m.isMesh || m.userData.isHalo) return;
    // pièce séparée : on l'élargit depuis son propre centre ; le masque commun ne garde que le contour extérieur
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const local = sharedCenter ? m.worldToLocal(center.clone()) : m.geometry.boundingBox.getCenter(new THREE.Vector3());
    const mats = [[haloMask, 998], ...HALO_RINGS.map(([px, alpha]) => [new THREE.ShaderMaterial({
      vertexShader: HALO_VS, fragmentShader: HALO_FS,
      uniforms: { uRes: { value: haloRes }, uPx: { value: px }, uAlpha: { value: alpha }, uCenter: { value: local } },
      transparent: true, depthTest: false, depthWrite: false,
      stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
    }), 999])];
    for (const [mat, order] of mats) {
      const h = new THREE.Mesh(m.geometry, mat);
      h.renderOrder = order;
      h.visible = false;
      h.userData.isHalo = true;
      h.raycast = () => {};
      m.add(h); // accroché à son maillage : le halo suit l'objet quand il bouge
      parts.push(h);
    }
  });
  target.userData.halo = parts;
}
const setHalo = (target, on) => target?.userData.halo?.forEach((h) => (h.visible = on));

// halo des objets cliquables de la chambre, par ensemble : tout le PC s'entoure d'un coup, etc.
const HOVER_SETS = [
  (n) => PC_PARTS.test(n) && !/^Mousepad/.test(n), // écran, unité centrale, clavier, souris
  (n) => WALL_SHELF.test(n),                       // étagère murale et ce qui est posé dessus
  (n) => PRINTER.test(n),                          // imprimante
  (n) => /^Diploma/.test(n),                       // diplôme et son cadre
  (n) => n === "PosterSamurai",                    // affiche
].map((test) => ({ test, objs: [] }));
let roomHalo = null;

function setupRoomHalos() {
  for (const set of HOVER_SETS) {
    set.objs = roomRoot.children.filter((o) => set.test(o.name));
    set.objs.forEach((o) => makeHalo(o));
  }
}
// objet survolé (premier niveau de la chambre) → allume le halo de tout son ensemble
function setRoomHalo(obj) {
  const set = obj ? HOVER_SETS.find((s) => s.test(obj.name)) || null : null;
  if (roomHalo === set) return;
  roomHalo?.objs.forEach((o) => setHalo(o, false));
  roomHalo = set;
  set?.objs.forEach((o) => setHalo(o, true));
}

function setupBlurays() {
  roomRoot.traverse((o) => { if (BR_TITLES[o.name]) blurays.push(o); });
  blurays.forEach((b) => makeHalo(b, { sharedCenter: true }));
}

function pickBluray(e) {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  let o = ray.intersectObjects(blurays, true).find((h) => !h.object.userData.isHalo)?.object || null;
  while (o && !BR_TITLES[o.name]) o = o.parent;
  return o;
}

function setBrHover(b) {
  if (brHover === b) return;
  setHalo(brHover, false);
  brHover = b;
  setHalo(b, true);
  document.body.style.cursor = b ? "pointer" : "";
}

// pose devant la caméra : jaquette face à nous, légèrement tournée pour laisser voir la tranche ;
// la figurine, elle, se présente de face (légèrement de trois quarts), à la taille de sa boîte englobante
function viewPose() {
  const fig = insp.obj?.name === "ShelfFigure";
  const dir = camera.getWorldDirection(new THREE.Vector3());
  const d = (fig ? insp.size : 0.171) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * (fig ? 0.75 : 0.62));
  const c = camera.position.clone().addScaledVector(dir, d);
  const y = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  let x, z;
  if (fig) { z = dir.clone().negate(); x = new THREE.Vector3().crossVectors(y, z); } // avant de la figurine → vers nous
  else { x = dir.clone().negate(); z = new THREE.Vector3().crossVectors(x, y); }     // face de la jaquette → vers nous
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  q.premultiply(new THREE.Quaternion().setFromAxisAngle(y, fig ? -0.3 : 0.35));
  return { c, q };
}

function animTo(to, dur, done) {
  insp.anim = { fc: insp.c.clone(), fq: insp.q.clone(), to, dur, t: 0, done };
}

function placeInspected() {
  insp.obj.quaternion.copy(insp.q);
  insp.obj.position.copy(insp.c).sub(insp.cLocal.clone().applyQuaternion(insp.q));
}

function inspectBluray(b) {
  if (state !== "shelf" || insp.obj) return;
  sound.open();
  setBrHover(null);
  tipEl.hidden = true;
  // centre de la boîte englobante, exprimé dans le repère du boîtier
  b.updateMatrixWorld(true);
  const inv = b.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  b.traverse((m) => {
    if (!m.isMesh || m.userData.isHalo) return;
    m.geometry.computeBoundingBox();
    box.union(m.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld)));
  });
  box.getCenter(insp.cLocal);
  const bs = box.getSize(new THREE.Vector3());
  insp.size = Math.max(bs.y, bs.x * 0.75); // encombrement à l'écran (figurine : ailes comprises)
  insp.obj = b;
  insp.parent = b.parent;
  scene.attach(b);
  insp.q0.copy(b.quaternion);
  insp.c0.copy(insp.cLocal).applyQuaternion(b.quaternion).add(b.position);
  insp.q.copy(insp.q0);
  insp.c.copy(insp.c0);
  insp.spin.set(0, 0);
  state = "bluray";
  if (INSPECT_TITLES[b.name]) {
    closeupTitle.textContent = INSPECT_TITLES[b.name];
    closeupTitle.hidden = false;
  }
  animTo({ c: insp.c0.clone().add(PULL), q: insp.q0.clone() }, 0.45, () => animTo(viewPose(), 0.75));
}

function putBackBluray() {
  if (state !== "bluray" || !insp.obj) return;
  sound.close();
  closeupTitle.hidden = true;
  insp.drag = null;
  insp.spin.set(0, 0);
  animTo({ c: insp.c0.clone().add(PULL), q: insp.q0.clone() }, 0.6, () =>
    animTo({ c: insp.c0.clone(), q: insp.q0.clone() }, 0.4, () => {
      insp.parent.attach(insp.obj);
      insp.obj = null;
      state = "shelf";
    }));
}

// rotation autour des axes de l'écran (glisser horizontal : gauche/droite, vertical : haut/bas)
function rotateInspected(yaw, pitch) {
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  insp.q.premultiply(new THREE.Quaternion().setFromAxisAngle(up, yaw));
  insp.q.premultiply(new THREE.Quaternion().setFromAxisAngle(right, pitch));
  insp.q.normalize();
}

canvas.addEventListener("pointerdown", (e) => {
  if (state !== "bluray" || insp.anim) return;
  insp.drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
  insp.spin.set(0, 0);
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  const d = insp.drag;
  if (!d) return;
  const dx = e.clientX - d.x, dy = e.clientY - d.y, now = performance.now();
  if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
  const k = 0.012;
  rotateInspected(dx * k, dy * k);
  const dt = Math.max(1, now - d.t) / 1000;
  insp.spin.set((dx * k) / dt, (dy * k) / dt); // vitesse retenue pour l'élan au relâcher
  d.x = e.clientX;
  d.y = e.clientY;
  d.t = now;
});
canvas.addEventListener("pointerup", (e) => {
  const d = insp.drag;
  if (!d) return;
  insp.drag = null;
  if (performance.now() - d.t > 80) insp.spin.set(0, 0); // relâché à l'arrêt : pas d'élan
  // simple clic à côté du boîtier : on le range
  if (!d.moved && pickBluray(e) !== insp.obj) {
    insp.spin.set(0, 0);
    putBackBluray();
  }
});

function updateInspect(dt) {
  if (!insp.obj) return;
  const a = insp.anim;
  if (a) {
    a.t += dt;
    const k = Math.min(1, a.t / a.dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    insp.c.lerpVectors(a.fc, a.to.c, e);
    insp.q.slerpQuaternions(a.fq, a.to.q, e);
    if (k >= 1) {
      insp.anim = null;
      a.done?.();
    }
  } else if (!insp.drag && insp.spin.lengthSq() > 1e-4) {
    rotateInspected(insp.spin.x * dt, insp.spin.y * dt);
    insp.spin.multiplyScalar(Math.pow(0.05, dt)); // l'élan s'amortit en ~1 s
  }
  if (insp.obj) placeInspected();
}

// ------------------------------------------------------------------
//  Imprimante : la feuille du CV sort, tombe dans la chambre,
//  et le fichier est téléchargé en même temps
// ------------------------------------------------------------------
// Chaque impression ajoute une feuille : elles s'empilent au sol, chacune avec
// sa propre chute (dérive, balancement, rotation tirés au hasard).
const sheets = [];
let printing = null; // { mesh, t, fall params } pendant l'impression
const exitPos = new THREE.Vector3();
const SHEET_W = 0.21, SHEET_H = 0.297, MAX_SHEETS = 30;
// marge devant le meuble : demi-diagonale de la feuille (elle peut tourner sur elle-même)
const SHEET_CLEAR = Math.hypot(SHEET_W, SHEET_H) / 2 + 0.02;
let cabinetFront = -Infinity, cabinetTop = 0; // façade et plateau du meuble (lus dans le modèle)
let sheetGeo = null, sheetMat = null;
const rand = (a, b) => a + Math.random() * (b - a);

function printCV() {
  if (state !== "intro" || printing || !named.PrinterExit) return;
  // téléchargement lancé directement dans le clic (geste utilisateur) : les navigateurs
  // l'acceptent sans demande d'autorisation, même après plusieurs impressions
  downloadCV(CV.owner.cvFile);
  sound.unlock();
  sound.print(1.6);
  hideTip();
  sheetGeo ??= new THREE.PlaneGeometry(SHEET_W, SHEET_H);
  sheetMat ??= new THREE.MeshLambertMaterial({ map: TX.cvSheetTex(CV.printout), side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(sheetGeo, sheetMat);
  mesh.name = "PrintedCV";
  scene.add(mesh);
  pickables.push(mesh);
  sheets.push(mesh);
  // au-delà d'une trentaine de feuilles, on retire la plus ancienne (celle tout en bas)
  if (sheets.length > MAX_SHEETS) {
    const old = sheets.shift();
    scene.remove(old);
    pickables.splice(pickables.indexOf(old), 1);
  }
  named.PrinterExit.getWorldPosition(exitPos);
  if (named.Cabinet) {
    const box = new THREE.Box3().setFromObject(named.Cabinet);
    cabinetFront = box.max.z;
    cabinetTop = box.max.y;
  }
  printing = {
    mesh, t: 0,
    fall: rand(1.8, 2.6),              // durée de la chute
    driftZ: rand(0.35, 0.6),           // vers l'avant de la chambre
    driftX: rand(-0.14, 0.14),         // à gauche / à droite
    swayAmp: rand(0.05, 0.14), swayFreq: rand(1.5, 3), // balancement latéral
    flutter: rand(0.35, 0.7), flutterFreq: rand(2, 4), // la feuille "plane"
    spin: rand(-1.4, 1.4),             // rotation finale au sol
    // hauteur finale : un cheveu au-dessus des feuilles déjà tombées → effet de pile
    floorY: 0.003 + (sheets.length - 1) * 0.0018,
  };
}
function updatePrint(dt) {
  if (!printing) return;
  const P = printing;
  P.t += dt;
  const t = P.t, OUT = 1.8;
  // la feuille est à plat, le haut de la page vers l'avant de l'imprimante
  let x = exitPos.x, y = exitPos.y, z = exitPos.z, rx = -Math.PI / 2, rz = 0;
  if (t < OUT) {
    // sortie par à-coups, synchronisée avec les passages de la tête
    const k = t / OUT;
    const steps = Math.floor(k * 8) / 8 + Math.min(1, (k * 8) % 1 * 3) / 8;
    z += -SHEET_H / 2 + steps * (SHEET_H + 0.02);
    y += 0.004;
    rx += -0.08 * steps;
  } else {
    // chute en planant jusqu'au sol, trajectoire différente à chaque fois
    const p = Math.min(1, (t - OUT) / P.fall);
    const settle = 1 - p;
    // la feuille avance surtout au début de la chute (elle "décolle" de l'imprimante)…
    z += SHEET_H / 2 + 0.02 + (1 - Math.pow(1 - p, 3)) * P.driftZ;
    // …et ne repasse jamais derrière la façade du meuble tant qu'elle est au-dessus du sol
    // (contrainte progressive : aucune saute tant que la feuille est encore au-dessus du plateau)
    y = THREE.MathUtils.lerp(exitPos.y, P.floorY, Math.pow(p, 1.8)); // chute un peu retardée
    const below = THREE.MathUtils.clamp((cabinetTop + 0.1 - y) / 0.15, 0, 1);
    z = Math.max(z, cabinetFront + SHEET_CLEAR * below);
    x += P.driftX * p + Math.sin(p * Math.PI * P.swayFreq) * P.swayAmp * settle;
    rx += Math.sin(p * Math.PI * P.flutterFreq) * P.flutter * settle;
    rz = P.spin * p;
    if (p >= 1) printing = null;
  }
  P.mesh.position.set(x, y, z);
  P.mesh.rotation.set(rx, 0, rz);
  if (named.PrinterLED) named.PrinterLED.visible = !printing || Math.floor(t * 8) % 2 === 0;
}

// ------------------------------------------------------------------
//  Boucle d'animation
// ------------------------------------------------------------------
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
// place un marqueur au-dessus d'un point projeté (coordonnées normalisées), sans le laisser
// déborder de l'écran : près d'un bord, l'étiquette glisse vers l'intérieur au lieu d'être coupée
function placeQuest(el, p) {
  el.hidden = false;
  const half = el.offsetWidth / 2 + 6;
  const x = Math.min(innerWidth - half, Math.max(half, ((p.x + 1) / 2) * innerWidth));
  el.style.transform = `translate(${x}px, ${((1 - p.y) / 2) * innerHeight}px) translate(-50%, -100%)`;
}

function frame() {
  // filet de sécurité : sur Android, la barre d'adresse qui apparaît ou disparaît ne déclenche pas
  // toujours l'événement « resize » ; on resynchronise dès que la taille de la fenêtre a changé
  if (innerWidth !== viewW || innerHeight !== viewH) resize();
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (tween) stepTween(dt);
  else if (state === "intro") {
    // parallaxe de la souris le long de l'horizontale de la vue (elle suit la rotation autour de la chambre)
    const a = Math.atan2(camPos.x - START.target.x, camPos.z - START.target.z);
    introPos(tmp).add(new THREE.Vector3(Math.cos(a) * parallax.x * 0.3, -parallax.y * 0.15 + Math.sin(t * 0.6) * 0.03, -Math.sin(a) * parallax.x * 0.3));
    camPos.lerp(tmp, 0.05);
    camTarget.lerp(START.target, 0.05);
  }
  if (state !== "desk" || tween) applyCam();
  city?.update(t, camera.position); // parallaxe de la ville calée sur la caméra

  screenFx.draw(t);
  const m = screenFx.mode;
  // lueur fixe quand on est installé devant le PC : avec l'éclairage toon à paliers, la moindre
  // pulsation fait basculer de grands aplats du décor d'un palier à l'autre (clignotements sombres)
  screenLight.intensity = m === "hidden" ? 2.0 : m === "idle" ? 2.0 + Math.sin(t * 9) * 0.08 : m === "boot" ? 1.6 : 0.2;

  // marqueur de quête au-dessus du PC
  if (state === "intro" && named.MonitorBezel) placeQuest(questEl, QUEST_POS.clone().project(camera));
  else questEl.hidden = true;
  // …et au-dessus de l'imprimante
  if (state === "intro" && named.Printer && !printing) placeQuest(questPrintEl, named.Printer.getWorldPosition(tmp).add(PRINT_QUEST_OFFSET).project(camera));
  else questPrintEl.hidden = true;
  updatePrint(dt);
  updateDiplomaCue(t);
  updateInspect(dt);
  renderer.getDrawingBufferSize(haloRes);
  if (named.TowerLED) named.TowerLED.visible = m === "boot" || m === "desk" ? Math.random() > 0.4 : true;

  if (!frozen) renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
