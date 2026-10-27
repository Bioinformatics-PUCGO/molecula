/* =====================================================================
   comum.js — funções compartilhadas pelas duas páginas de AR
   (endereço da página, QR Code, cartaz A4 e botão de realidade aumentada)
   ===================================================================== */
export const $ = id => document.getElementById(id);

export function baseUrl(){
  const p = location.pathname.replace(/index\.html$/, "");
  const o = (location.origin && location.origin !== "null") ? location.origin : "file://";
  return o + p;
}
export function aviso(txt, ms = 2800){
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = txt;
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}

/* QR com módulos levemente arredondados e localizadores clássicos
   (estilo testado em leitor independente; pontos redondos falharam em alguns endereços) */
export function qrSvg(url, cor = "#0B2540"){
  const qr = globalThis.qrcode(0, "Q"); qr.addData(url); qr.make();
  const n = qr.getModuleCount(), q = 4, tam = n + q * 2;
  const loc = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tam} ${tam}" shape-rendering="geometricPrecision" role="img" aria-label="QR Code"><rect width="${tam}" height="${tam}" fill="#fff"/>`;
  for(let r = 0; r < n; r++) for(let c = 0; c < n; c++) if(qr.isDark(r, c) && !loc(r, c)) s += `<rect x="${c + q + .03}" y="${r + q + .03}" width=".94" height=".94" rx=".22" fill="${cor}"/>`;
  [[0, 0], [0, n - 7], [n - 7, 0]].forEach(([r, c]) => { const x = c + q, y = r + q; s += `<rect x="${x + .5}" y="${y + .5}" width="6" height="6" fill="none" stroke="${cor}" stroke-width="1"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="${cor}"/>`; });
  return s + "</svg>";
}
function helixSvg(){
  const W = 60, H = 1000, amp = 18, per = 220, cx = 30; let a = "", b = "", rungs = "";
  for(let y = 0; y <= H; y += 8){ const x = Math.sin(y / per * Math.PI * 2) * amp; a += (y ? "L" : "M") + (cx + x).toFixed(1) + " " + y; b += (y ? "L" : "M") + (cx - x).toFixed(1) + " " + y; }
  for(let y = 10; y < H; y += 22){ const x = Math.sin(y / per * Math.PI * 2) * amp; rungs += `<line x1="${(cx + x).toFixed(1)}" y1="${y}" x2="${(cx - x).toFixed(1)}" y2="${y}" stroke="#A9CFE4" stroke-width="2.4" stroke-linecap="round"/>`; }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true">${rungs}<path d="${a}" fill="none" stroke="#0B78A5" stroke-width="3.4" stroke-linecap="round"/><path d="${b}" fill="none" stroke="#5BB6D6" stroke-width="3.4" stroke-linecap="round"/></svg>`;
}

/* cartaz A4 deste link (abre com ?cartaz) */
export function mostrarCartaz({ eyebrow, titulo, medida, passos, rodape }){
  const url = baseUrl(), el = $("cartaz");
  const local = !location.origin || location.origin === "null" || /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname);
  el.innerHTML = `
    <div class="ferramentas"><button class="btn" id="btnImprimir" type="button">Imprimir cartaz (A4)</button>
      <p class="${local ? "alerta" : ""}">${local ? "Atenção: esta página está aberta em um endereço local. O QR só funcionará nos celulares depois de publicar o site e abrir o cartaz pelo endereço público." : "O QR Code aponta para: " + url}</p></div>
    <section class="folha"><div class="dna esq">${helixSvg()}</div><div class="dna dir">${helixSvg()}</div>
      <div class="p-logos"><img src="../assets/logo-cegen.png" alt="CEGGen" onerror="this.style.display='none'"><span class="vsep"></span><img class="alta" src="../assets/logo-genia.png" alt="GenIA" onerror="this.style.display='none'"></div>
      <p class="p-eyebrow">${eyebrow}</p><h2>${titulo}</h2><span class="p-medida">${medida}</span>
      <div class="p-qr">${qrSvg(url)}</div>
      <p class="p-cta">Aponte a câmera do celular para o QR Code</p>
      <ol>${passos.map((t, i) => `<li><b>${i + 1}</b><span>${t}</span></li>`).join("")}</ol>
      <p class="p-credit">${rodape}</p></section>`;
  el.classList.remove("hide"); document.querySelector("main").classList.add("hide");
  $("btnImprimir").onclick = () => print();
  document.title = "Cartaz · " + document.title;
}

/* botão de AR: aparece só se o aparelho suporta; senão mostra QR da página para abrir no celular */
export function ligarAR(mv, { botao, blocoDesktop, qrEl }){
  const verificar = () => {
    const ok = !!mv.canActivateAR;
    botao.classList.toggle("hide", !ok); blocoDesktop.classList.toggle("hide", ok);
    if(!ok && qrEl && !qrEl.dataset.pronto){ qrEl.innerHTML = qrSvg(baseUrl() + location.search.replace(/[?&]exportar/, "")); qrEl.dataset.pronto = "1"; }
  };
  mv.addEventListener("load", () => { verificar(); setTimeout(verificar, 800); setTimeout(verificar, 2500); });
  botao.onclick = () => mv.activateAR();
  mv.addEventListener("ar-status", e => { if(e.detail.status === "failed") aviso("Não foi possível abrir a realidade aumentada neste aparelho."); });
}
export const ICONE_AR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg>';
