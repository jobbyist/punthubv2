import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

const Q = new URLSearchParams(location.search);
const P = Q.get('p') || 'mug';
const S = +(Q.get('s') || 1600);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(S, S);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = +(Q.get('e') || 1.0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new RoomEnvironment();
{ const sb = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 9), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  sb.material.color.setScalar(14); sb.position.set(-5, 2, 6); sb.lookAt(0, 0, 0); envScene.add(sb); }
scene.environment = pmrem.fromScene(envScene, 0.02).texture;
scene.environmentIntensity = 0.75;

// ---------- helpers ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function loadImg(src) { return new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; }); }

function backdrop(top = '#F3F1ED', bottom = '#E2DFD9') {
  const c = canvas(1024, 1024), g = c.getContext('2d');
  const gr = g.createRadialGradient(512, 420, 80, 512, 520, 820);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  scene.background = tex(c);
}

function keyLight(pos, intensity = 2.2, range = 3, radius = 14) {
  const l = new THREE.DirectionalLight(0xffffff, intensity);
  l.position.set(...pos);
  l.castShadow = true;
  l.shadow.mapSize.set(2048, 2048);
  l.shadow.radius = radius;
  l.shadow.blurSamples = 24;
  l.shadow.bias = -0.0004;
  Object.assign(l.shadow.camera, { left: -range, right: range, top: range, bottom: -range, near: 0.1, far: 30 });
  scene.add(l);
  return l;
}

function groundXZ(y = 0, opacity = 0.28) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity }));
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; scene.add(m);
}
function groundXY(z = 0, opacity = 0.3) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity }));
  m.position.z = z; m.receiveShadow = true; scene.add(m);
}

// fine noise / weave tile used as bump
function weaveTile(size, kind, seed = 7) {
  const c = canvas(size, size), g = c.getContext('2d');
  const img = g.createImageData(size, size), r = rnd(seed);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 128;
    if (kind === 'twill') v += 46 * Math.sin(((x + y) / size) * Math.PI * 2 * (size / 6));
    if (kind === 'jersey') {
      const cx = x % 8, row = Math.floor(y / 10), cy = (y % 10) / 10;
      const vx = Math.abs(cx - 4) / 4; // V-stitch
      v += 60 * (1 - Math.abs(vx - (cy * 0.9 + 0.05))) - 30;
    }
    if (kind === 'rib') v += 70 * Math.sin((x / size) * Math.PI * 2 * (size / 10));
    v += (r() - 0.5) * 50;
    const i = (y * size + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v)); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = tex(c, false); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------- products ----------
async function mug() {
  backdrop();
  const logo = await loadImg('logo_thick.png');
  const R = 0.42, H = 0.98;
  const circ = 2 * Math.PI * R;
  const W = 4096, Hh = Math.round(W * H / circ);
  const c = canvas(W, Hh), g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, Hh);
  const lh = Hh * 0.72, lw = lh * logo.width / logo.height;
  for (const u of [0.5, 0.0, 1.0]) g.drawImage(logo, u * W - lw / 2, Hh * 0.5 - lh / 2, lw, lh);
  const map = tex(c);

  const grp = new THREE.Group(); scene.add(grp);
  const outerMat = new THREE.MeshPhysicalMaterial({ map, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06 });
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.985, H, 192, 1, true, -Math.PI, Math.PI * 2), outerMat);
  outer.castShadow = true; grp.add(outer);
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0b0d12, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05 });
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.03, R - 0.03, H - 0.04, 128, 1, true), black.clone());
  inner.material.side = THREE.BackSide; inner.position.y = 0.02; grp.add(inner);
  const innerBottom = new THREE.Mesh(new THREE.CircleGeometry(R - 0.03, 96), black); innerBottom.rotation.x = -Math.PI / 2; innerBottom.position.y = -H / 2 + 0.06; grp.add(innerBottom);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.015, 0.0155, 24, 192), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = H / 2; grp.add(rim);
  const base = new THREE.Mesh(new THREE.CircleGeometry(R * 0.985, 96), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 }));
  base.rotation.x = Math.PI / 2; base.position.y = -H / 2; grp.add(base);
  // D-shaped handle
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const a = -Math.PI / 2 + (i / 60) * Math.PI;
    pts.push(new THREE.Vector3(R - 0.04 + Math.cos(a) * 0.27, Math.sin(a) * 0.3 + 0.03, 0));
  }
  const handle = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.05, 32, false), black);
  handle.scale.set(1, 1, 1.0); handle.geometry.scale(1, 1, 0.75); handle.castShadow = true; grp.add(handle);
  grp.position.y = H / 2;
  grp.rotation.y = 0.42;
  // logo must face the camera: rotate texture front to match
  map.offset.x = 0.42 / (2 * Math.PI); map.wrapS = THREE.RepeatWrapping;

  groundXZ(0, 0.32);
  keyLight([-2.4, 4.2, 3.2], 2.4, 2);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(3, 1.5, 2); scene.add(fill);
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  cam.position.set(0.1, 1.15, 3.6); cam.lookAt(0.06, 0.46, 0);
  return cam;
}

async function cap() {
  backdrop();
  const logo = await loadImg('logo_sticker_flat.png');
  const grp = new THREE.Group(); scene.add(grp);
  // crown bump/colour map in sphere UV space (u around, v up)
  const CW = 4096, CH = 2048;
  const bc = canvas(CW, CH), b = bc.getContext('2d');
  b.fillStyle = '#808080'; b.fillRect(0, 0, CW, CH);
  // twill
  b.globalAlpha = 0.35; b.strokeStyle = '#ffffff'; b.lineWidth = 2;
  for (let x = -CH; x < CW; x += 6) { b.beginPath(); b.moveTo(x, CH); b.lineTo(x + CH, 0); b.stroke(); }
  b.globalAlpha = 1;
  // seams + double stitching
  for (let k = 0; k < 6; k++) {
    const u = ((0.25 + k / 6) % 1) * CW;
    b.fillStyle = '#202020'; b.fillRect(u - 5, 0, 10, CH);
    b.strokeStyle = '#c8c8c8'; b.lineWidth = 3; b.setLineDash([14, 10]);
    for (const off of [-22, 22]) { b.beginPath(); b.moveTo(u + off, CH); b.lineTo(u + off * 0.2, 60); b.stroke(); }
    b.setLineDash([]);
    // eyelet
    const eu = ((0.25 + 1 / 12 + k / 6) % 1) * CW;
    if (k !== 5) { b.fillStyle = '#ffffff'; b.beginPath(); b.ellipse(eu, CH * 0.2, 26, 40, 0, 0, 7); b.fill(); b.fillStyle = '#000'; b.beginPath(); b.ellipse(eu, CH * 0.2, 13, 22, 0, 0, 7); b.fill(); }
  }
  // base stitching band

  const bump = tex(bc, false);
  const fabric = new THREE.MeshPhysicalMaterial({ color: 0x121214, roughness: 0.86, bumpMap: bump, bumpScale: 1.2, sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x55575c) });
  const crownGeo = new THREE.SphereGeometry(1, 192, 96, 0, Math.PI * 2, 0, Math.PI / 2);
  // shape: deeper front-to-back, taller front, flatter top
  const p = crownGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    z *= 1.12; x *= 0.98;
    y = y * 0.78 * (1 + 0.1 * Math.max(0, z));
    y = Math.min(y, 0.74 + 0.06 * z); // slightly flattened crown
    p.setXYZ(i, x, y, z);
  }
  crownGeo.computeVertexNormals();
  const crown = new THREE.Mesh(crownGeo, fabric); crown.castShadow = true; grp.add(crown);
  // inner (back-face) so the opening looks dark
  const innerC = new THREE.Mesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1, side: THREE.BackSide })); grp.add(innerC);
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.07, 32, 16), fabric); button.scale.y = 0.45; button.position.y = 0.79; grp.add(button);

  // brim
  const brimBump = (() => {
    const c = canvas(2048, 512), g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 2048, 512);
    g.globalAlpha = 0.35; g.strokeStyle = '#fff'; g.lineWidth = 2;
    for (let x = -512; x < 2048; x += 6) { g.beginPath(); g.moveTo(x, 512); g.lineTo(x + 512, 0); g.stroke(); }
    g.globalAlpha = 1; g.strokeStyle = '#c4c4c4'; g.lineWidth = 3; g.setLineDash([12, 9]);
    for (const v of [0.94, 0.86, 0.78, 0.70, 0.62]) { g.beginPath(); g.moveTo(0, (1 - v) * 512); g.lineTo(2048, (1 - v) * 512); g.stroke(); }
    return tex(c, false);
  })();
  const brimMat = fabric.clone(); brimMat.bumpMap = brimBump; if (Q.get('dbg')) brimMat.color.set(0xff0000); brimMat.side = THREE.DoubleSide;
  const brimFn = (u, v, t) => {
    const a = (u - 0.5) * Math.PI * 0.86;
    const ix = Math.sin(a) * 0.985, iz = Math.cos(a) * 0.985 * 1.12;
    const ox = Math.sin(a) * 1.12, oz = Math.cos(a) * 1.85;
    const x = ix + (ox - ix) * v, z = iz + (oz - iz) * v;
    const y = -0.02 - 0.22 * x * x * v - 0.06 * v * v;
    t.set(x, y, z);
  };
  const brim = new THREE.Mesh(new ParametricGeometry(brimFn, 160, 40), brimMat); brim.castShadow = true; grp.add(brim);
  const edgePts = []; const tmp = new THREE.Vector3();
  for (let i = 0; i <= 160; i++) { brimFn(i / 160, 1, tmp); edgePts.push(tmp.clone()); }
  const edge = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePts), 320, 0.022, 12), fabric); grp.add(edge);

  // embroidered logo decal
  const lc = canvas(logo.width, logo.height), lg = lc.getContext('2d'); lg.drawImage(logo, 0, 0);
  // thread texture for bump: raised edges + satin lines
  const tc = canvas(logo.width, logo.height), tg = tc.getContext('2d');
  tg.fillStyle = '#000'; tg.fillRect(0, 0, tc.width, tc.height);
  tg.filter = 'blur(10px)'; tg.drawImage(logo, 0, 0); tg.filter = 'none';
  tg.globalCompositeOperation = 'source-atop';
  tg.fillStyle = 'rgba(255,255,255,1)'; tg.fillRect(0, 0, tc.width, tc.height);
  tg.globalCompositeOperation = 'multiply'; tg.strokeStyle = '#9a9a9a'; tg.lineWidth = 4;
  for (let x = -tc.height; x < tc.width; x += 9) { tg.beginPath(); tg.moveTo(x, tc.height); tg.lineTo(x + tc.height * 0.6, 0); tg.stroke(); }
  const decalMat = new THREE.MeshPhysicalMaterial({ map: tex(lc), bumpMap: tex(tc, false), bumpScale: 3, transparent: true, alphaTest: 0.5, roughness: 0.55, sheen: 0.35, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffffff), polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false });
  const th = 1.07; // polar angle from top (rad)
  const pos = new THREE.Vector3(0, Math.cos(th) * 0.78 * 1.1, Math.sin(th) * 1.12);
  const dummy = new THREE.Object3D(); dummy.position.copy(pos);
  dummy.lookAt(new THREE.Vector3(0, pos.y + 0.55, pos.z + 1.0));
  const sizeW = 0.92;
  const decal = new THREE.Mesh(new DecalGeometry(crown, pos, dummy.rotation, new THREE.Vector3(sizeW, sizeW * logo.height / logo.width, 1.2)), decalMat);
  grp.add(decal);

  grp.rotation.set(0.26, -0.45, 0.0);
  grp.position.y = 0.5;
  groundXZ(0, 0.3);
  keyLight([-2.6, 4.4, 3.4], 2.6, 2.6);
  const fill = new THREE.DirectionalLight(0xffffff, 0.7); fill.position.set(3, 1.2, 2.5); scene.add(fill);
  const rimL = new THREE.DirectionalLight(0xffffff, 0.8); rimL.position.set(1.5, 2.5, -3); scene.add(rimL);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  cam.position.set(0.0, 2.0, 7.0); cam.lookAt(0.05, 0.42, 0.25);
  return cam;
}

function sockGeometry(curve, hwFn, thick, segL = 400, segR = 96) {
  const pos = [], uv = [], idx = [];
  const L = curve.getLength();
  for (let i = 0; i <= segL; i++) {
    const t = i / segL;
    const p = curve.getPointAt(t), T = curve.getTangentAt(t);
    const N = new THREE.Vector3(-T.y, T.x, 0).normalize();
    const { hw, heel, cap } = hwFn(t);
    for (let j = 0; j <= segR; j++) {
      const ph = (j / segR) * Math.PI * 2;
      const c = Math.cos(ph), s = Math.sin(ph);
      const side = c < 0 ? hw * (1 + heel) : hw;
      const flat = Math.sign(s) * Math.pow(Math.abs(s), 0.5);
      const o = new THREE.Vector3().addScaledVector(N, side * c).add(new THREE.Vector3(0, 0, thick * cap * flat));
      pos.push(p.x + o.x, p.y + o.y, p.z + o.z);
      const u = ph <= Math.PI ? (1 - c) / 4 : 0.5 + (1 + c) / 4;
      uv.push(u, 1 - t);
    }
  }
  for (let i = 0; i < segL; i++) for (let j = 0; j < segR; j++) {
    const a = i * (segR + 1) + j, b2 = a + segR + 1;
    idx.push(a, b2, a + 1, b2, b2 + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return { g, L };
}

async function socks() {
  backdrop('#F4F2EE', '#E4E1DB');
  const logo = await loadImg('logo_thick.png');
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.15, 0), new THREE.Vector3(0, 1.3, 0), new THREE.Vector3(0.0, 0.55, 0),
    new THREE.Vector3(0.12, 0.05, 0), new THREE.Vector3(0.55, -0.2, 0), new THREE.Vector3(1.15, -0.24, 0), new THREE.Vector3(1.62, -0.22, 0),
  ], false, 'catmullrom', 0.5);
  const hwFn = (t) => {
    let hw = 0.29, heel = 0, cap = 1;
    if (t < 0.13) hw = 0.30; // cuff
    const hc = 0.47; heel = 0.32 * Math.exp(-Math.pow((t - hc) / 0.05, 2));
    if (t > 0.9) { const k = (t - 0.9) / 0.1; hw *= Math.sqrt(Math.max(0, 1 - k * k)) * 0.9 + 0.0; cap = Math.sqrt(Math.max(0, 1 - k * k)); }
    if (t > 0.62) hw *= 0.94;
    return { hw: Math.max(hw, 0.001), heel, cap };
  };
  const { g: geo, L } = sockGeometry(curve, hwFn, 0.055);
  // colour map
  const MW = 1024, MH = 4096;
  const c = canvas(MW, MH), gx = c.getContext('2d');
  gx.fillStyle = '#f7f7f5'; gx.fillRect(0, 0, MW, MH);
  gx.fillStyle = '#0d0f14'; gx.fillRect(0, 0, MW, MH * 0.125);
  gx.fillStyle = '#16A34A'; gx.fillRect(0, MH * 0.138, MW, MH * 0.012); gx.fillRect(0, MH * 0.158, MW, MH * 0.012);
  gx.fillStyle = '#e9e9e6'; gx.fillRect(0, MH * 0.92, MW, MH * 0.08); // toe reinforcement
  // logo on the front face (u 0..0.5), mirrored because u runs right-to-left on screen
  const pxPerUnitU = (MW * 0.5) / (2 * 0.29), pxPerUnitV = MH / L;
  const wU = 0.46, hU = wU * logo.height / logo.width;
  const cx = MW * 0.25, cy = MH * 0.33;
  gx.save(); gx.translate(cx, cy); gx.scale(-1, 1);
  gx.drawImage(logo, -wU * pxPerUnitU / 2, -hU * pxPerUnitV / 2, wU * pxPerUnitU, hU * pxPerUnitV);
  gx.restore();
  const map = tex(c);
  const knit = weaveTile(128, 'rib'); knit.repeat.set(26, 90);
  const mat = new THREE.MeshPhysicalMaterial({ map, bumpMap: knit, bumpScale: 1.2, roughness: 0.92, sheen: 0.5, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide });
  const s1 = new THREE.Mesh(geo, mat); s1.castShadow = true; s1.receiveShadow = true;
  const s2 = s1.clone();
  s1.position.set(-1.05, -0.05, 0.06); s1.rotation.z = 0.05;
  s2.position.set(0.12, -0.18, 0.06); s2.rotation.z = -0.06;
  scene.add(s1, s2);
  groundXY(0, 0.3);
  keyLight([-2.5, 3.0, 5.5], 2.2, 3, 10);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(3, -1, 4); scene.add(fill);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(-0.32, 0.45, 7.4); cam.lookAt(-0.32, 0.62, 0);
  return cam;
}

async function tee() {
  backdrop('#F3F1ED', '#E1DED8');
  const logo = await loadImg('logo_sticker.png');
  const PW = 2000, PH = 2200, WU = 4.0, HU = 4.4;
  const shape = (g) => {
    g.beginPath();
    g.moveTo(820, 250);
    g.quadraticCurveTo(1000, 430, 1180, 250); // front neckline
    g.bezierCurveTo(1300, 285, 1400, 300, 1450, 330); // shoulder
    g.bezierCurveTo(1600, 400, 1740, 520, 1830, 640); // sleeve top
    g.lineTo(1660, 905); // sleeve hem
    g.bezierCurveTo(1580, 860, 1520, 820, 1455, 800); // underarm
    g.bezierCurveTo(1450, 1200, 1470, 1700, 1460, 2060); // side
    g.quadraticCurveTo(1000, 2090, 540, 2060); // hem
    g.bezierCurveTo(530, 1700, 550, 1200, 545, 800);
    g.bezierCurveTo(480, 820, 420, 860, 340, 905);
    g.lineTo(170, 640);
    g.bezierCurveTo(260, 520, 400, 400, 550, 330);
    g.bezierCurveTo(600, 300, 700, 285, 820, 250);
    g.closePath();
  };
  // alpha
  const ac = canvas(PW, PH), a = ac.getContext('2d'); a.fillStyle = '#000'; a.fillRect(0, 0, PW, PH); a.fillStyle = '#fff'; shape(a); a.fill();
  // blurred height field
  const hc = canvas(PW / 4, PH / 4), h = hc.getContext('2d'); h.fillStyle = '#000'; h.fillRect(0, 0, hc.width, hc.height);
  h.filter = 'blur(28px)'; h.drawImage(ac, 0, 0, hc.width, hc.height); h.filter = 'none';
  const hd = h.getImageData(0, 0, hc.width, hc.height).data;
  // colour map
  const mc = canvas(PW, PH), m = mc.getContext('2d');
  m.fillStyle = '#18181a'; m.fillRect(0, 0, PW, PH);
  // inner back neck visible through neckline
  m.fillStyle = '#0c0c0d'; m.beginPath(); m.moveTo(820, 250); m.quadraticCurveTo(1000, 430, 1180, 250); m.quadraticCurveTo(1000, 300, 820, 250); m.fill();
  // collar rib band
  m.strokeStyle = '#202023'; m.lineWidth = 34; m.beginPath(); m.moveTo(830, 262); m.quadraticCurveTo(1000, 410, 1170, 262); m.stroke();
  m.strokeStyle = '#26262a'; m.lineWidth = 3; m.setLineDash([10, 7]);
  m.beginPath(); m.moveTo(810, 280); m.quadraticCurveTo(1000, 452, 1190, 280); m.stroke(); m.setLineDash([]);
  // print: 10in wide on a ~20in wide body (body is ~915px) -> ~460px
  const lw = 520, lh = lw * logo.height / logo.width;
  m.drawImage(logo, 1000 - lw / 2, 560, lw, lh);
  const map = tex(mc);
  // roughness: print smoother than cotton
  const rc = canvas(PW / 2, PH / 2), r = rc.getContext('2d'); r.fillStyle = '#f2f2f2'; r.fillRect(0, 0, rc.width, rc.height);
  r.filter = 'brightness(0)'; r.globalAlpha = 0.55; r.drawImage(logo, (1000 - lw / 2) / 2, 280, lw / 2, lh / 2);
  const rough = tex(rc, false);
  const jersey = weaveTile(128, 'jersey'); jersey.repeat.set(70, 77);

  const geo = new THREE.PlaneGeometry(WU, HU, 500, 550);
  const pp = geo.attributes.position, uvs = geo.attributes.uv;
  const rr = rnd(11);
  const folds = Array.from({ length: 7 }, () => ({ a: rr() * Math.PI, f: 1.2 + rr() * 2.2, ph: rr() * 6, amp: 0.012 + rr() * 0.02 }));
  for (let i = 0; i < pp.count; i++) {
    const u = uvs.getX(i), v = uvs.getY(i);
    const hx = Math.min(hc.width - 1, Math.floor(u * hc.width)), hy = Math.min(hc.height - 1, Math.floor((1 - v) * hc.height));
    const hv = hd[(hy * hc.width + hx) * 4] / 255;
    const x = pp.getX(i), y = pp.getY(i);
    let z = 0.1 * Math.pow(hv, 0.6);
    for (const f of folds) z += f.amp * hv * Math.sin((x * Math.cos(f.a) + y * Math.sin(f.a)) * f.f * 2 + f.ph);
    // soft crease across sleeves and a gentle wave at the hem
    z += 0.014 * hv * Math.exp(-Math.pow((y - 1.15) / 0.06, 2)) * (Math.abs(x) > 0.85 ? 1 : 0);
    z += 0.01 * Math.sin(x * 9) * Math.exp(-Math.pow((y + 1.85) / 0.12, 2)) * hv;
    pp.setZ(i, z);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({ map, alphaMap: tex(ac, false), alphaTest: 0.5, roughnessMap: rough, roughness: 1, bumpMap: jersey, bumpScale: 0.9, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x5a5c62), side: THREE.DoubleSide });
  const shirt = new THREE.Mesh(geo, mat); shirt.castShadow = true; shirt.receiveShadow = true;
  shirt.position.z = 0.012; shirt.rotation.z = 0.035;
  scene.add(shirt);
  groundXY(0, 0.34);
  keyLight([-3, 3.4, 4.2], 2.8, 3.2, 12);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(3, -1, 4); scene.add(fill);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(0, 0.05, 8.6); cam.lookAt(0, 0.05, 0);
  return cam;
}

const cam = await ({ mug, cap, socks, tee })[P]();
renderer.render(scene, cam);
renderer.render(scene, cam);
window.DONE = true;
