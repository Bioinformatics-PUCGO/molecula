/* =====================================================================
   molecula.js — do arquivo PDB ao modelo 3D em escala real (metros)

   lerPDB(texto)          lê um arquivo .pdb (só o 1º modelo) e separa proteínas,
                          fitas de ácido nucleico e ligantes
   dnaIlustrativo()       DNA B ilustrativo (usado se o PDB não puder ser baixado)
   montar(dados, opções)  devolve um THREE.Group alinhado (DNA na vertical),
                          apoiado em y = 0 e com a maior dimensão = tamanho (m)
   exportarGLB(grupo)     ArrayBuffer .glb
   carregarPDB(id)        baixa do RCSB (com PDBe como reserva)

   Representação: proteína em tubos coloridos (arco-íris do N ao C; hélices mais
   grossas), DNA com esqueleto em tubo e bases em placas coloridas (mesmas cores
   do jogo: A verde, T vermelho, C azul, G âmbar), ligantes em bolas e bastões.
   Cada cor é um material próprio (sem cor por vértice), para funcionar também
   no Quick Look do iPhone.
   ===================================================================== */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

const AA = new Set("ALA ARG ASN ASP CYS GLN GLU GLY HIS ILE LEU LYS MET PHE PRO SER THR TRP TYR VAL MSE SEC PYL HID HIE HIP CYX".split(" "));
const AGUA = new Set(["HOH", "WAT", "DOD", "H2O", "TIP", "SOL"]);
const BASE_DE = { DA: "A", DT: "T", DG: "G", DC: "C", DU: "U", DI: "G", DOC: "C", A: "A", T: "T", G: "G", C: "C", U: "U", I: "G" };
const FOSFATO = new Set(["P", "OP1", "OP2", "OP3", "O1P", "O2P", "O3P"]);
export const COR_BASE = { A: 0x5ce08a, T: 0xe8405a, C: 0x5aa9ff, G: 0xf2a33c, U: 0xd58aff, N: 0xb8c4d0 };
const COR_ELEMENTO = { C: 0xb9c4d0, N: 0x4a78ff, O: 0xff5a5a, P: 0xff9d2e, S: 0xf4d03f, MG: 0x5fe08a, ZN: 0xa8a8c8, NA: 0xb48cff, K: 0xb48cff, CA: 0x66d9a0, CL: 0x5fe0c0 };
const RAIO_COV = { H: .31, C: .76, N: .71, O: .66, P: 1.07, S: 1.05 };

/* =====================================================================
   1. LEITURA DO PDB
   ===================================================================== */
export function lerPDB(texto){
  const atomos = [], hel = [], fol = []; let titulo = "";
  for(const l of texto.split(/\r?\n/)){
    const r = l.slice(0, 6);
    if(r === "ENDMDL") break;                                        // só o primeiro modelo (NMR tem vários)
    if(r === "TITLE ") titulo += l.slice(10).trim() + " ";
    else if(r === "HELIX ") hel.push({ c: l[19], a: parseInt(l.slice(21, 25)), b: parseInt(l.slice(33, 37)) });
    else if(r === "SHEET ") fol.push({ c: l[21], a: parseInt(l.slice(22, 26)), b: parseInt(l.slice(33, 37)) });
    else if(r === "ATOM  " || r === "HETATM"){
      const alt = l[16]; if(alt !== " " && alt !== "A" && alt !== "1") continue;
      const nome = l.slice(12, 16).trim().replace(/\*/g, "'");
      let el = l.slice(76, 78).trim().toUpperCase();
      if(!el) el = nome.replace(/[^A-Za-z]/g, "").slice(0, 1).toUpperCase();
      if(el === "H" || el === "D") continue;
      atomos.push({ nome, el, res: l.slice(17, 20).trim(), cad: l[21], seq: parseInt(l.slice(22, 26)), ic: l[26],
                    p: V(+l.slice(30, 38), +l.slice(38, 46), +l.slice(46, 54)) });
    }
  }
  if(!atomos.length) throw new Error("O arquivo não tem átomos reconhecíveis.");

  // agrupa em resíduos, na ordem do arquivo
  const mapa = new Map(), residuos = [];
  for(const a of atomos){
    const k = `${a.cad}|${a.seq}|${a.ic}|${a.res}`;
    if(!mapa.has(k)){ const r = { cad: a.cad, seq: a.seq, res: a.res, atomos: [] }; mapa.set(k, r); residuos.push(r); }
    mapa.get(k).atomos.push(a);
  }
  const tipo = r => {
    if(AGUA.has(r.res)) return "agua";
    const n = new Set(r.atomos.map(a => a.nome));
    if(AA.has(r.res) && n.has("CA")) return "aa";
    if(BASE_DE[r.res] || (n.has("C1'") && (n.has("P") || n.has("O3'")))) return "nuc";
    return "lig";
  };
  const ssDe = (cad, seq) => {
    for(const h of hel) if(h.c === cad && seq >= h.a && seq <= h.b) return "H";
    for(const f of fol) if(f.c === cad && seq >= f.a && seq <= f.b) return "E";
    return "C";
  };
  const temSS = hel.length + fol.length > 0;

  const proteinas = [], fitas = [], ligantes = [];
  let seg = null, fita = null, ultimo = null;
  for(const r of residuos){
    const t = tipo(r);
    if(t === "aa"){
      const ca = r.atomos.find(a => a.nome === "CA").p.clone();
      const quebra = !seg || seg.cad !== r.cad || seg.ca[seg.ca.length - 1].distanceTo(ca) > 4.6;
      if(quebra){ seg = { cad: r.cad, ca: [], seqs: [], ss: [] }; proteinas.push(seg); }
      seg.ca.push(ca); seg.seqs.push(r.seq); seg.ss.push(ssDe(r.cad, r.seq));
      fita = null;
    }else if(t === "nuc"){
      const n = nucleotideo(r);
      if(!n) continue;
      const quebra = !fita || fita.cad !== r.cad || fita.residuos[fita.residuos.length - 1].bb.distanceTo(n.bb) > 9;
      if(quebra){ fita = { cad: r.cad, residuos: [] }; fitas.push(fita); }
      fita.residuos.push(n);
      seg = null;
    }else if(t === "lig"){
      ligantes.push({ res: r.res, atomos: r.atomos.map(a => ({ el: a.el, p: a.p.clone() })) });
    }
  }
  const prot = proteinas.filter(s => s.ca.length >= 3);
  if(!temSS) prot.forEach(estimarSS);
  return { titulo: titulo.trim(), proteinas: prot, fitas: fitas.filter(f => f.residuos.length >= 2), ligantes };
}

/* um resíduo de DNA/RNA → ponto do esqueleto, açúcar C1' e placa da base */
function nucleotideo(r){
  const at = {}; r.atomos.forEach(a => { at[a.nome] = a.p; });
  const bb = at.P || at["O5'"] || at["C5'"] || at["C4'"]; const c1 = at["C1'"];
  if(!bb || !c1) return null;
  const base = r.atomos.filter(a => !a.nome.endsWith("'") && !FOSFATO.has(a.nome)).map(a => a.p);
  let letra = BASE_DE[r.res];
  if(!letra) letra = base.length > 0 ? (r.atomos.some(a => a.nome === "N9") ? "A" : "C") : "N";
  if(base.length < 3) return { base: letra, bb: bb.clone(), c1: c1.clone(), centro: c1.clone().lerp(bb, .3), A: V(1, 0, 0), N: V(0, 1, 0), B: V(0, 0, 1), compr: 3, larg: 2.4 };
  const centro = base.reduce((s, p) => s.add(p), V()).multiplyScalar(1 / base.length);
  const v1 = base.reduce((m, p) => (p.distanceTo(centro) > m.distanceTo(centro) ? p : m), base[0]).clone().sub(centro);
  const v2 = base.reduce((m, p) => (V().crossVectors(v1, p.clone().sub(centro)).length() > V().crossVectors(v1, m.clone().sub(centro)).length() ? p : m), base[0]).clone().sub(centro);
  const N = V().crossVectors(v1, v2).normalize(), A = v1.clone().normalize(), B = V().crossVectors(N, A).normalize();
  let a0 = 0, a1 = 0, b0 = 0, b1 = 0;
  base.forEach(p => { const d = p.clone().sub(centro), x = d.dot(A), y = d.dot(B); a0 = Math.min(a0, x); a1 = Math.max(a1, x); b0 = Math.min(b0, y); b1 = Math.max(b1, y); });
  return { base: letra, bb: bb.clone(), c1: c1.clone(), centro, A, N, B, compr: (a1 - a0) + 1.6, larg: (b1 - b0) + 1.6, desloc: (a0 + a1) / 2 };
}

/* se o arquivo não traz HELIX/SHEET, estima pela geometria dos carbonos alfa */
function estimarSS(seg){
  const n = seg.ca.length, d = (i, j) => seg.ca[i].distanceTo(seg.ca[j]);
  for(let i = 0; i < n; i++){
    let t = "C";
    if(i + 4 < n && d(i, i + 3) > 4.4 && d(i, i + 3) < 5.7 && d(i, i + 4) > 5.5 && d(i, i + 4) < 7) t = "H";
    else if(i + 2 < n && d(i, i + 2) > 6.0) t = "E";
    seg.ss[i] = t;
  }
  for(let i = 0; i < n; i++){ if(seg.ss[i] === "H") for(let k = 1; k <= 3 && i + k < n; k++) seg.ss[i + k] = "H"; }
}

/* =====================================================================
   2. DNA ILUSTRATIVO (reserva, sem PDB)
   ===================================================================== */
export function dnaIlustrativo(seq = "CGCGAATTCGCGCATGC"){
  const COMP = { A: "T", T: "A", C: "G", G: "C" }, n = seq.length, subida = 3.4, giro = 36 * Math.PI / 180;
  const f1 = { cad: "1", residuos: [] }, f2 = { cad: "2", residuos: [] };
  const pol = (r, ang, y) => V(Math.cos(ang) * r, y, Math.sin(ang) * r);
  for(let i = 0; i < n; i++){
    const y = i * subida, fi = i * giro;
    [[f1, seq[i], fi, 0], [f2, COMP[seq[i]], fi + 2.6, 1]].forEach(([f, letra, ang, k]) => {
      const rad = pol(1, ang, 0).normalize(), pur = letra === "A" || letra === "G";
      const A = V(rad.x, 0, rad.z).multiplyScalar(-1), N = V(0, 1, 0);
      const comp = pur ? 5.6 : 4.4;
      f.residuos.push({ base: letra, bb: pol(9.4, ang - .35, y + (k ? .4 : -.4)), c1: pol(7.2, ang, y), centro: pol(3.1 - (pur ? .2 : 0), ang, y + .1),
                        A, N, B: V().crossVectors(N, A).normalize(), compr: comp, larg: 3 });
    });
  }
  f2.residuos.reverse();
  return { titulo: "DNA ilustrativo (B-DNA)", proteinas: [], fitas: [f1, f2], ligantes: [], ilustrativo: true };
}

/* =====================================================================
   3. GEOMETRIA
   ===================================================================== */
const PALETA = [0x3b6fe0, 0x28b5c8, 0x3fcf8a, 0xf2c744, 0xf2994a, 0xe8505b].map(c => new THREE.Color(c));
function arcoIris(t){
  const x = Math.min(.9999, Math.max(0, t)) * (PALETA.length - 1), i = Math.floor(x);
  return PALETA[i].clone().lerp(PALETA[i + 1], x - i);
}
const R_SS = { H: 1.15, E: .85, C: .5 };               // raio do tubo (Å) por estrutura secundária

function suavizar(pontos, porTrecho){
  const curva = new THREE.CatmullRomCurve3(pontos, false, "centripetal");
  return curva.getPoints((pontos.length - 1) * porTrecho);
}

/* anéis de um tubo com raio variável; quadros por transporte paralelo */
function aneis(pts, raios, lados){
  const n = pts.length, T = pts.map((_, i) => pts[Math.min(i + 1, n - 1)].clone().sub(pts[Math.max(i - 1, 0)]).normalize());
  let nr = V().crossVectors(Math.abs(T[0].y) < .9 ? UP : V(1, 0, 0), T[0]).normalize();
  const out = [];
  for(let i = 0; i < n; i++){
    if(i > 0){ const ax = V().crossVectors(T[i - 1], T[i]), s = ax.length(); if(s > 1e-6) nr.applyAxisAngle(ax.divideScalar(s), Math.asin(Math.min(1, s))); }
    nr.sub(T[i].clone().multiplyScalar(nr.dot(T[i]))).normalize();
    const b = V().crossVectors(T[i], nr).normalize(), anel = [];
    for(let j = 0; j < lados; j++){ const a = j / lados * Math.PI * 2, d = nr.clone().multiplyScalar(Math.cos(a)).addScaledVector(b, Math.sin(a)); anel.push({ d, p: pts[i].clone().addScaledVector(d, raios[i]) }); }
    out.push(anel);
  }
  return out;
}
/* malha de um trecho [i0..i1] dos anéis */
function malhaTubo(an, i0, i1, lados){
  const pos = [], nor = [], idx = [];
  for(let i = i0; i <= i1; i++) for(let j = 0; j < lados; j++){ const v = an[i][j]; pos.push(v.p.x, v.p.y, v.p.z); nor.push(v.d.x, v.d.y, v.d.z); }
  for(let i = 0; i < i1 - i0; i++) for(let j = 0; j < lados; j++){
    const j2 = (j + 1) % lados, a = i * lados + j, b = i * lados + j2, c = (i + 1) * lados + j, d = (i + 1) * lados + j2;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return g;
}
function esfera(p, r, seg = 8){ const g = new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)); g.deleteAttribute("uv"); g.translate(p.x, p.y, p.z); return g; }
function bastao(a, b, r){
  const d = b.clone().sub(a), g = new THREE.CylinderGeometry(r, r, d.length(), 6, 1, true); g.deleteAttribute("uv");
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize())); const m = a.clone().add(b).multiplyScalar(.5); g.translate(m.x, m.y, m.z); return g;
}
function placa(n){
  const g = new THREE.BoxGeometry(n.compr * .94, .5, n.larg * .94); g.deleteAttribute("uv");
  const rot = new THREE.Matrix4().makeBasis(n.A, n.N, V().crossVectors(n.A, n.N));   // base destra (A × N), senão a malha sai espelhada
  g.applyMatrix4(rot); const c = n.centro.clone().addScaledVector(n.A, n.desloc || 0); g.translate(c.x, c.y, c.z); return g;
}

function eixoPrincipal(pts){
  const c = pts.reduce((s, p) => s.add(p), V()).multiplyScalar(1 / pts.length);
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  pts.forEach(p => { const d = p.clone().sub(c); xx += d.x * d.x; xy += d.x * d.y; xz += d.x * d.z; yy += d.y * d.y; yz += d.y * d.z; zz += d.z * d.z; });
  let v = V(1, .31, .17).normalize();
  for(let i = 0; i < 80; i++) v = V(xx * v.x + xy * v.y + xz * v.z, xy * v.x + yy * v.y + yz * v.z, xz * v.x + yz * v.y + zz * v.z).normalize();
  return v;
}

/* =====================================================================
   4. MONTAGEM DO MODELO
   opções: { proteina: true, tamanho: 2.5 }
   ===================================================================== */
export function montar(dados, { proteina = true, tamanho = 2.5 } = {}){
  const prot = proteina ? dados.proteinas : [];
  // alinha: o eixo do DNA fica na vertical (ou o maior eixo da proteína)
  const refer = dados.fitas.flatMap(f => f.residuos.map(r => r.centro));
  const eixo = eixoPrincipal(refer.length >= 6 ? refer : prot.flatMap(s => s.ca).concat(refer));
  const q = new THREE.Quaternion().setFromUnitVectors(eixo, UP);
  const gv = v => v.applyQuaternion(q);
  prot.forEach(s => s.ca.forEach(gv));
  dados.fitas.forEach(f => f.residuos.forEach(r => { ["bb", "c1", "centro", "A", "N", "B"].forEach(k => gv(r[k])); }));
  dados.ligantes.forEach(l => l.atomos.forEach(a => gv(a.p)));
  dados._girado = true;

  // caixa para centralizar e escalar
  const todos = [...prot.flatMap(s => s.ca), ...dados.fitas.flatMap(f => f.residuos.flatMap(r => [r.bb, r.centro])), ...(proteina ? dados.ligantes.flatMap(l => l.atomos.map(a => a.p)) : [])];
  const caixa = new THREE.Box3().setFromPoints(todos), tam = caixa.getSize(V()), maior = Math.max(tam.x, tam.y, tam.z);
  const esc = tamanho / (maior + 2.4);                                         // +2,4 Å: raio dos tubos nas duas pontas
  const cx = (caixa.min.x + caixa.max.x) / 2, cz = (caixa.min.z + caixa.max.z) / 2, y0 = caixa.min.y - 1.2;

  const porMat = new Map();
  const mats = new Map();
  const material = (cor, rug = .5, met = 0) => { const k = `${cor}|${rug}|${met}`; if(!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: cor, roughness: rug, metalness: met })); return mats.get(k); };
  const adicionar = (nome, mat, g) => { if(!porMat.has(mat)) porMat.set(mat, { nome, gs: [] }); porMat.get(mat).gs.push(g); };

  // ---- proteína: tubos em arco-íris ----
  const total = prot.reduce((s, x) => s + x.ca.length, 0) || 1; let acum = 0, NB = 22;
  prot.forEach((seg, k) => {
    const m = seg.ca.length, PS = 6, pts = suavizar(seg.ca, PS), n = pts.length;
    const alvo = seg.ss.map(s => R_SS[s]), raios = pts.map((_, i) => {
      const x = i / PS, i0 = Math.max(0, Math.min(m - 1, Math.floor(x))), i1 = Math.min(m - 1, i0 + 1), f = x - i0;
      const suave = a => { let s = 0, c = 0; for(let d = -1; d <= 1; d++){ const j = Math.max(0, Math.min(m - 1, a + d)); s += alvo[j]; c++; } return s / c; };
      return suave(i0) * (1 - f) + suave(i1) * f;
    });
    const an = aneis(pts, raios, 8);
    let ini = 0;
    const faixaDe = i => Math.min(NB - 1, Math.floor((acum + i / (n - 1) * m) / total * NB));
    for(let i = 1; i <= n - 1; i++){
      if(i === n - 1 || faixaDe(i) !== faixaDe(i - 1)){ const b = faixaDe(i - 1) ; adicionar("proteina", material(arcoIris((b + .5) / NB).getHex(), .42), malhaTubo(an, ini, i, 8)); ini = i; }
    }
    adicionar("proteina", material(arcoIris(acum / total).getHex(), .42), esfera(pts[0], raios[0], 8));
    adicionar("proteina", material(arcoIris((acum + m) / total).getHex(), .42), esfera(pts[n - 1], raios[n - 1], 8));
    acum += m;
  });

  // ---- ácidos nucleicos: esqueleto + bases ----
  const COR_FITA = [0xe6eef8, 0xaec6e0];
  dados.fitas.forEach((f, k) => {
    const pts = f.residuos.map(r => r.bb);
    const lisos = pts.length >= 2 ? suavizar(pts, 4) : pts, raios = lisos.map(() => .62);
    if(lisos.length >= 2){ const an = aneis(lisos, raios, 8); adicionar("esqueleto-dna", material(COR_FITA[k % 2], .35, .1), malhaTubo(an, 0, lisos.length - 1, 8)); }
    adicionar("esqueleto-dna", material(COR_FITA[k % 2], .35, .1), esfera(pts[0], .62)); adicionar("esqueleto-dna", material(COR_FITA[k % 2], .35, .1), esfera(pts[pts.length - 1], .62));
    f.residuos.forEach(r => {
      const mb = material(COR_BASE[r.base] || COR_BASE.N, .38);
      adicionar("bases-" + r.base, mb, placa(r));
      adicionar("bases-" + r.base, mb, bastao(r.c1, r.centro, .3));
      adicionar("bases-" + r.base, mb, esfera(r.c1, .5, 6));
      adicionar("esqueleto-dna", material(COR_FITA[k % 2], .35, .1), bastao(r.bb, r.c1, .3));
    });
  });

  // ---- ligantes (só no modo com proteína): bolas e bastões ----
  if(proteina) dados.ligantes.forEach(l => {
    const a = l.atomos;
    if(a.length === 1){ adicionar("ions", material(COR_ELEMENTO[a[0].el] || 0xc9a0ff, .3, .2), esfera(a[0].p, 1.0, 10)); return; }
    a.forEach(x => adicionar("ligante", material(COR_ELEMENTO[x.el] || 0xc9a0ff, .4), esfera(x.p, .5, 8)));
    for(let i = 0; i < a.length; i++) for(let j = i + 1; j < a.length; j++){
      const lim = ((RAIO_COV[a[i].el] || .8) + (RAIO_COV[a[j].el] || .8)) * 1.25;
      if(a[i].p.distanceTo(a[j].p) < lim) adicionar("ligante", material(0xdfe6ee, .5), bastao(a[i].p, a[j].p, .2));
    }
  });

  // ---- junta por material, move para a origem e escala para metros ----
  const M = new THREE.Matrix4().makeScale(esc, esc, esc).multiply(new THREE.Matrix4().makeTranslation(-cx, -y0, -cz));
  const grupo = new THREE.Group(); grupo.name = "molecula";
  porMat.forEach(({ nome, gs }, mat) => {
    gs.forEach(g => { if(g.index === null) g.setIndex([...Array(g.attributes.position.count).keys()]); });
    const g = gs.length === 1 ? gs[0] : mergeGeometries(gs, false);
    g.applyMatrix4(M); const m = new THREE.Mesh(g, mat); m.name = nome; grupo.add(m);
  });
  grupo.userData.resumo = resumo(dados, proteina);
  grupo.userData.escalaAngstrom = esc;                                         // metros por Å
  return grupo;
}

export function resumo(d, comProteina = true){
  return { aminoacidos: comProteina ? d.proteinas.reduce((s, x) => s + x.ca.length, 0) : 0, nucleotideos: d.fitas.reduce((s, f) => s + f.residuos.length, 0),
           fitas: d.fitas.length, ligantes: d.ligantes.filter(l => l.atomos.length > 1).length, titulo: d.titulo, ilustrativo: !!d.ilustrativo };
}

/* =====================================================================
   5. EXPORTAÇÃO E DOWNLOAD
   ===================================================================== */
export function exportarGLB(obj){
  return new Promise((res, rej) => new GLTFExporter().parse(obj, res, rej, { binary: true, onlyVisible: true }));
}
/* procura primeiro nos arquivos locais (assets/pdb/), depois no RCSB e no PDBe */
export async function carregarPDB(id, locais = [], remoto = true){
  id = String(id).toUpperCase();
  const fontes = [...locais];
  if(remoto) fontes.push(`https://files.rcsb.org/download/${id}.pdb`, `https://www.ebi.ac.uk/pdbe/entry-files/download/pdb${id.toLowerCase()}.ent`);
  let erro = null;
  for(const u of fontes){
    try{ const r = await fetch(u); if(r.ok){ const t = await r.text(); if(/^(ATOM|HETATM)/m.test(t)) return t; erro = new Error("Arquivo sem átomos: " + u); } else erro = new Error("HTTP " + r.status); }catch(e){ erro = e; }
  }
  throw erro || new Error("Não foi possível carregar " + id);
}
