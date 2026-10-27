/* =====================================================================
   modelos-fotos.js — objetos em ESCALA REAL (metros) para fotos virtuais

   criarCelular({ logos })   celular de 1,50 m de altura (com base)
   criarFoto51()             painel de 2,00 m com a Foto 51 (recriação) e legenda
   criarCromossomo()         cromossomo humano de ~1,8 m

   Usado pelo gerador (ferramentas/gerar-modelos.html), que exporta .glb.
   ===================================================================== */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const mat = (cor, rug = .5, met = 0, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: cor, roughness: rug, metalness: met }, extra));

function canvasTextura(w, h, desenhar, jpeg = false){
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const c = cv.getContext("2d"); desenhar(c, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;   // flipY padrão: o exportador glTF compensa
  if(jpeg) t.userData.mimeType = "image/jpeg";
  return t;
}
function retArredondado(c, x, y, w, h, r){
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function planoArredondado(w, h, r){
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0); s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI); s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  const g = new THREE.ShapeGeometry(s, 16), p = g.attributes.position, uv = [];
  for(let i = 0; i < p.count; i++) uv.push((p.getX(i) - x) / w, (p.getY(i) - y) / h);   // v = 1 no topo (convenção do three)
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); return g;
}

/* =====================================================================
   CELULAR GIGANTE — 1,50 m (corpo 1,45 m + base 0,05 m)
   ===================================================================== */
export function criarCelular({ logos = {} } = {}){
  const g = new THREE.Group(); g.name = "celular-gigante";
  const H = 1.45, W = .70, D = .075, base = .05, y0 = base + H / 2;

  // tela
  const tela = canvasTextura(1024, 2122, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w * .4, h); gr.addColorStop(0, "#082a4a"); gr.addColorStop(.55, "#0d6d99"); gr.addColorStop(1, "#16b4cb");
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    // hélice decorativa ao fundo
    c.globalAlpha = .16; c.lineWidth = 10;
    for(let k = 0; k < 2; k++){ c.strokeStyle = k ? "#bfefff" : "#ffffff"; c.beginPath(); for(let y = 0; y <= h; y += 8){ const x = w * .5 + Math.sin(y / 190 + k * Math.PI) * w * .36; y ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
    c.globalAlpha = 1;
    // câmera frontal e barra de status
    c.fillStyle = "#02070c"; c.beginPath(); c.arc(w / 2, 78, 24, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#fff"; c.font = "600 44px system-ui, 'DejaVu Sans', sans-serif"; c.textAlign = "left"; c.fillText("9:41", 80, 92);
    c.textAlign = "right"; c.fillRect(w - 190, 66, 42, 22); c.fillRect(w - 130, 70, 8, 14); c.fillRect(w - 112, 62, 8, 22); c.fillRect(w - 94, 54, 8, 30);
    // cartão com as logos
    c.fillStyle = "rgba(255,255,255,.96)"; retArredondado(c, 110, 190, w - 220, 330, 56); c.fill();
    if(logos.cegen){ const r = logos.cegen.width / logos.cegen.height, hh = 118; c.drawImage(logos.cegen, 170, 300, hh * r, hh); }
    if(logos.genia){ const r = logos.genia.width / logos.genia.height, hh = 250; c.drawImage(logos.genia, w - 170 - hh * r, 230, hh * r, hh); }
    // título
    c.textAlign = "center"; c.fillStyle = "#ffffff"; c.font = "800 118px system-ui, 'DejaVu Sans', sans-serif"; c.fillText("Trilha", w / 2, 690); c.fillText("Genética", w / 2, 815);
    c.font = "500 54px system-ui, 'DejaVu Sans', sans-serif"; c.globalAlpha = .9; c.fillText("CEGGen × GenIA", w / 2, 905); c.globalAlpha = 1;
    // "publicação"
    c.fillStyle = "rgba(4,22,40,.55)"; retArredondado(c, 90, 1010, w - 180, 700, 60); c.fill();
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 4; retArredondado(c, 90, 1010, w - 180, 700, 60); c.stroke();
    const A = { A: "#5ce08a", T: "#e8405a", C: "#5aa9ff", G: "#f2a33c" }, comp = { A: "T", T: "A", C: "G", G: "C" }, seq = "ATGCGATCCTAGGCATC";
    for(let i = 0; i < seq.length; i++){
      const t = i / (seq.length - 1), x1 = w / 2 + Math.sin(t * Math.PI * 2.2) * 170, x2 = w / 2 - Math.sin(t * Math.PI * 2.2) * 170, y = 1090 + t * 540;
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 7; c.beginPath(); c.moveTo(x1, y); c.lineTo(x2, y); c.stroke();
      c.fillStyle = A[seq[i]]; c.beginPath(); c.arc(x1, y, 24, 0, Math.PI * 2); c.fill();
      c.fillStyle = A[comp[seq[i]]]; c.beginPath(); c.arc(x2, y, 24, 0, Math.PI * 2); c.fill();
    }
    // ícones e legenda
    c.fillStyle = "#fff"; c.textAlign = "left";
    c.beginPath(); c.moveTo(130, 1805); c.bezierCurveTo(130, 1760, 190, 1745, 205, 1785); c.bezierCurveTo(220, 1745, 280, 1760, 280, 1805); c.bezierCurveTo(280, 1850, 205, 1890, 205, 1890); c.bezierCurveTo(205, 1890, 130, 1850, 130, 1805); c.fill();
    c.beginPath(); c.arc(395, 1810, 52, 0, Math.PI * 2); c.lineWidth = 9; c.strokeStyle = "#fff"; c.stroke();
    c.font = "600 56px system-ui, 'DejaVu Sans', sans-serif"; c.fillText("Tire sua foto virtual e compartilhe!", 120, 1975);
    c.fillStyle = "rgba(255,255,255,.35)"; for(let i = 0; i < 5; i++){ c.beginPath(); c.arc(170 + i * 170, 2060, 18, 0, Math.PI * 2); c.fill(); }
  }, true);

  const corpo = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 6, .085), mat(0x1b2431, .3, .75)); corpo.position.y = y0; corpo.name = "corpo"; g.add(corpo);
  const matTela = mat(0xe8f4ff, .25, 0, { map: tela, emissive: 0xffffff, emissiveMap: tela, emissiveIntensity: .55 });
  const vidro = new THREE.Mesh(planoArredondado(W - .045, H - .045, .07), matTela); vidro.position.set(0, y0, D / 2 + .0007); vidro.name = "tela"; g.add(vidro);
  // ilha de câmeras (costas)
  const ilha = new THREE.Mesh(new RoundedBoxGeometry(.27, .27, .024, 4, .06), mat(0x0f1620, .35, .6)); ilha.position.set(-W / 2 + .2, y0 + H / 2 - .21, -D / 2 - .012); ilha.name = "ilha-cameras"; g.add(ilha);
  [[-.065, .065], [.065, .065], [0, -.06]].forEach(([dx, dy], i) => {
    const anel = new THREE.Mesh(new THREE.CylinderGeometry(.052, .052, .016, 32), mat(0xb8c2cc, .25, .9)); anel.rotation.x = Math.PI / 2; anel.position.set(ilha.position.x + dx, ilha.position.y + dy, -D / 2 - .03); anel.name = "lente-anel-" + i; g.add(anel);
    const lente = new THREE.Mesh(new THREE.CylinderGeometry(.036, .036, .02, 32), mat(0x061018, .08, .5)); lente.rotation.x = Math.PI / 2; lente.position.set(anel.position.x, anel.position.y, -D / 2 - .036); lente.name = "lente-" + i; g.add(lente);
  });
  const flash = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .01, 20), mat(0xfff2c0, .4)); flash.rotation.x = Math.PI / 2; flash.position.set(ilha.position.x + .085, ilha.position.y - .075, -D / 2 - .027); flash.name = "flash"; g.add(flash);
  // botões laterais
  [[W / 2 + .004, .28, .13], [-W / 2 - .004, .36, .09], [-W / 2 - .004, .18, .09]].forEach(([x, dy, hh], i) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(.012, hh, .03), mat(0x2a3544, .3, .8)); b.position.set(x, y0 + dy, 0); b.name = "botao-" + i; g.add(b);
  });
  // base
  const soco = new THREE.Mesh(new RoundedBoxGeometry(.52, base, .27, 4, .02), mat(0x0b1118, .45, .3)); soco.position.set(0, base / 2, 0); soco.name = "base"; g.add(soco);
  return g;
}

/* =====================================================================
   FOTO 51 — recriação por simulação da difração de raios X de uma hélice
   Pico de camada n: intensidade ∝ J_n(2πR·x)², em y = n/P (P = 34 Å, R ≈ 10 Å)
   ===================================================================== */
function bessel(n, x){                                                          // J_n(x) pela integral de Bessel (Simpson)
  const N = 64, h = Math.PI / N; let s = 0;
  for(let k = 0; k <= N; k++){ const t = k * h; s += (k === 0 || k === N ? 1 : (k % 2 ? 4 : 2)) * Math.cos(n * t - x * Math.sin(t)); }
  return s * h / 3 / Math.PI;
}
export function desenharDifracao(c, N){
  const P = 34, R = 10, XM = .30, YM = .34, S = 1;
  const peso = { 0: .10, 1: .85, 2: 1, 3: .9, 4: .04, 5: .62, 6: .46, 7: .3, 8: .22, 9: .16, 10: 1.25, 11: .2, 12: .1 };
  const J2 = [];
  for(let l = 0; l <= 12; l++){
    const a = new Float32Array(N), x1 = (l + .8 * Math.cbrt(l) + .6) / (2 * Math.PI * R);          // posição do 1º máximo de J_l
    for(let i = 0; i < N; i++){ const u = Math.abs((i / (N - 1) * 2 - 1) * XM); const j = bessel(l, 2 * Math.PI * R * u), env = .09 + .91 / (1 + Math.exp((u - x1 * 1.32) / (x1 * .14))); a[i] = j * j * env; }
    J2.push(a);
  }
  const img = c.createImageData(N, N), d = img.data; let max = 0; const I = new Float32Array(N * N);
  const sx = .0125, sy = .0225;                                                  // linhas de camada largas: os picos se fundem no X
  for(let py = 0; py < N; py++){
    const v = (py / (N - 1) * 2 - 1) * YM;
    for(let px = 0; px < N; px++){
      const u = (px / (N - 1) * 2 - 1) * XM; let s = 0;
      for(let l = -12; l <= 12; l++){ const al = Math.abs(l), dy = (v - l / P) / sy; if(Math.abs(dy) > 4) continue; s += peso[al] * Math.exp(-dy * dy / 2) * J2[al][px]; }
      const anel = Math.exp(-Math.pow((Math.hypot(u, v) - .245) / .03, 2) / 2) * .10;               // anel difuso (água)
      const mer = (Math.exp(-Math.pow((Math.abs(u) - .035) / .02, 2) / 2)) * (Math.exp(-Math.pow((Math.abs(v) - .294) / .012, 2) / 2)) * .9; // reflexos de 3,4 Å
      s += anel + mer; I[py * N + px] = s; if(s > max) max = s;
    }
  }
  for(let py = 0; py < N; py++) for(let px = 0; px < N; px++){
    const x = px / (N - 1) * 2 - 1, y = py / (N - 1) * 2 - 1, r = Math.hypot(x, y);
    let val = Math.pow(I[py * N + px] / max, .62) * 245;
    val += 10 + 8 * (1 - r);                                                    // fundo do filme
    const barra = Math.exp(-Math.pow(x / .018, 2) / 2) * (Math.abs(y) < .12 ? 1 : 0), centro = r < .05 ? 1 : 0;
    val *= 1 - Math.min(1, Math.max(barra, centro) * 1);                         // sombra do anteparo
    val += (Math.random() - .5) * 14;                                            // grão
    if(r > .985) val *= Math.max(0, 1 - (r - .985) / .015);
    const k = (py * N + px) * 4; const vv = Math.max(0, Math.min(255, val)); d[k] = vv; d[k + 1] = vv; d[k + 2] = vv * .97; d[k + 3] = 255;
  }
  const tmp = document.createElement("canvas"); tmp.width = tmp.height = N; tmp.getContext("2d").putImageData(img, 0, 0);
  c.fillStyle = "#000"; c.fillRect(0, 0, N, N); c.filter = "blur(5px)"; c.drawImage(tmp, 0, 0); c.filter = "none";
}

export function criarFoto51(){
  const g = new THREE.Group(); g.name = "foto-51";
  const Wp = 1.10, Hp = 1.90, T = .05, y0 = .10;
  const quadro = new THREE.Mesh(new RoundedBoxGeometry(Wp, Hp, T, 4, .02), mat(0x0b2540, .5, .1)); quadro.position.y = y0 + Hp / 2; quadro.name = "painel"; g.add(quadro);
  [-.38, .38].forEach((x, i) => { const p = new THREE.Mesh(new THREE.BoxGeometry(.10, y0, .46), mat(0x0b1118, .5, .3)); p.position.set(x, y0 / 2, 0); p.name = "pe-" + i; g.add(p); });

  const foto = canvasTextura(1024, 1024, (c, w) => { c.fillStyle = "#000"; c.fillRect(0, 0, w, w); desenharDifracao(c, w); }, true);
  const mold = new THREE.Mesh(new THREE.BoxGeometry(.96, .96, .012), mat(0xdfe7ef, .4, .4)); mold.position.set(0, y0 + 1.34, T / 2 + .004); mold.name = "moldura"; g.add(mold);
  const img = new THREE.Mesh(new THREE.PlaneGeometry(.90, .90), mat(0xffffff, .55, 0, { map: foto })); img.position.set(0, y0 + 1.34, T / 2 + .0105); img.name = "foto-51-recriacao"; g.add(img);

  const legenda = canvasTextura(1024, 700, (c, w, h) => {
    c.fillStyle = "#0b2540"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#7fd6ec"; c.font = "700 44px system-ui, 'DejaVu Sans', sans-serif"; c.textAlign = "left"; c.fillText("DIFRAÇÃO DE RAIOS X · 1952", 60, 84);
    c.fillStyle = "#ffffff"; c.font = "800 128px system-ui, 'DejaVu Sans', sans-serif"; c.fillText("Foto 51", 60, 214);
    c.font = "600 56px system-ui, 'DejaVu Sans', sans-serif"; c.fillText("Rosalind Franklin (1920–1958)", 60, 296);
    c.fillStyle = "#c9d9e8"; c.font = "400 38px system-ui, 'DejaVu Sans', sans-serif";
    ["A imagem de difração de raios X de uma fibra de DNA,",
     "obtida no laboratório de Rosalind Franklin, em Londres,",
     "com o aluno Raymond Gosling. O padrão em X revelou",
     "que o DNA é uma hélice."].forEach((t, i) => c.fillText(t, 60, 372 + i * 52));
    c.fillStyle = "#7f9bb4"; c.font = "italic 32px system-ui, 'DejaVu Sans', sans-serif";
    c.fillText("Recriação ilustrativa por simulação; não é a foto original.", 60, 636);
  }, true);
  const leg = new THREE.Mesh(new THREE.PlaneGeometry(1.02, .70), mat(0xffffff, .6, 0, { map: legenda })); leg.position.set(0, y0 + .52, T / 2 + .0015); leg.name = "legenda"; g.add(leg);
  return g;
}

/* =====================================================================
   CROMOSSOMO — X com bandas, ~1,8 m
   ===================================================================== */
export function criarCromossomo(){
  const g = new THREE.Group(); g.name = "cromossomo";
  const corpo = mat(0xdcecff, .45, 0), bandaA = mat(0x2b5aa6, .5), bandaB = mat(0x1fb0c8, .5), centro = mat(0xffc94d, .35);
  const r = .115;
  const braco = (comp, ang, nBandas) => {
    const b = new THREE.Group();
    const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, comp, 8, 24), corpo); c.position.y = comp / 2 + .06; c.name = "cromatide"; b.add(c);
    for(let k = 0; k < nBandas; k++){
      const f = (k + .6) / (nBandas + .3), t = new THREE.Mesh(new THREE.TorusGeometry(r * 1.005, .02 + (k % 3) * .008, 10, 36), k % 2 ? bandaA : bandaB);
      t.rotation.x = Math.PI / 2; t.position.y = .06 + comp * f; t.name = "banda-" + k; b.add(t);
    }
    b.rotation.z = ang; return b;
  };
  const a = .42, braços = [braco(.42, a, 3), braco(.42, -a, 3), braco(.68, Math.PI - a, 5), braco(.68, Math.PI + a, 5)];
  braços.forEach(b => g.add(b));
  const cen = new THREE.Mesh(new THREE.SphereGeometry(r * 1.22, 24, 16), centro); cen.name = "centromero"; g.add(cen);
  g.scale.setScalar(1.24); g.updateMatrixWorld(true);                                              // ~1,8 m de altura
  const caixa = new THREE.Box3().setFromObject(g); g.position.y = -caixa.min.y;                     // pontas inferiores no chão
  const raiz = new THREE.Group(); raiz.name = "cromossomo-humano"; raiz.add(g); return raiz;
}
