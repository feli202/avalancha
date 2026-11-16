// Maquetas de Estratos: piezas comunes (script clásico, para que abra con file://).
// Cada estrato es una pila abeliana de verdad (regla de 4); los granos que se caen por el borde viajan al de abajo.

const PILA = ['#3fe0b4', '#c2a8ff', '#a4574f', '#8a5320'] // colores de la arena por altura 0..3 (paletas.ts)
const LV = ['#ffb547', '#ff6b6b', '#2dd4a7', '#9b7bff']
const rgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16))
const PRGB = PILA.map(rgb)
const mezcla = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t))
const css = (c, a = 1) => `rgb(${c[0]} ${c[1]} ${c[2]} / ${a})`
const hash = (i, k = 1) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5; return s - Math.floor(s) }

// Datos de ejemplo: Presión total 1,64, Densidad 1,15 → ×10^(1,64 × 1,15) = ×77; cada aporte es 10^(p × 1,15).
const EST = [
  { n: 1, granos: '3,21e9', ritmo: '1,46', aporte: '13', p: '0,97', perm: 6, pres: 4, lleno: 1, tope: true, cPerm: '1,6e3', cPres: '3,2e3', permX: ['2,8', '3,1'], presX: ['2', '2,25'] },
  { n: 2, granos: '1,62e7', ritmo: '1,31', aporte: '3,4', p: '0,46', perm: 3, pres: 2, lleno: 0.62, cPerm: '210', cPres: '480', permX: ['1,9', '2,2'], presX: ['1,5', '1,75'] },
  { n: 3, granos: '4,10e4', ritmo: '1,18', aporte: '1,7', p: '0,21', perm: 1, pres: 0, lleno: 0.24, cPerm: '12', cPres: '20', permX: ['1,3', '1,6'], presX: ['1', '1,25'] },
  { n: 4, costo: '1e7' }, { n: 5, costo: '1e11' }, { n: 6, costo: '1e16' }, { n: 7, costo: '1e22' }, { n: 8, costo: '1e29' },
]

const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]]
class Pila {
  /** sumidero(x, y, dx, dy): ¿el grano que sale de (x,y) hacia (dx,dy) se cae al de abajo? Si no, es pared y rebota. */
  constructor(w, h, { disco = false, sumidero = () => true } = {}) {
    Object.assign(this, { w, h, sumidero })
    this.a = new Uint32Array(w * h); this.toc = new Uint8Array(w * h); this.luz = new Float32Array(w * h); this.dentro = new Uint8Array(w * h).fill(1)
    if (disco) for (let i = 0; i < w * h; i++) if (Math.hypot((i % w) - (w - 1) / 2, Math.floor(i / w) - (h - 1) / 2) > Math.min(w, h) / 2 - 0.5) this.dentro[i] = 0
    this.total = this.dentro.reduce((s, v) => s + v, 0); this.llenas = 0; this.cola = []; this.salidas = []
  }
  echar(n = 1, x = this.w >> 1, y = this.h >> 1) {
    x = Math.max(0, Math.min(this.w - 1, Math.round(x))); y = Math.max(0, Math.min(this.h - 1, Math.round(y)))
    const i = y * this.w + x; this.a[i] += n; this.marcar(i); if (this.a[i] >= 4) this.cola.push(i)
  }
  marcar(i) { if (!this.toc[i]) { this.toc[i] = 1; this.llenas++ } }
  paso(max = 3000) {
    const { w, h, a } = this
    let k = 0
    while (this.cola.length && k++ < max) {
      const i = this.cola.pop(); if (a[i] < 4) continue
      const q = a[i] >> 2; a[i] &= 3; this.luz[i] = 1
      const x = i % w, y = (i - x) / w
      for (const [dx, dy] of D4) {
        const nx = x + dx, ny = y + dy, j = ny * w + nx
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || !this.dentro[j]) {
          if (this.sumidero(x, y, dx, dy)) { this.salidas.push([x, y, dx, dy, q]); continue }
          a[i] += q; continue // pared: se queda
        }
        a[j] += q; this.marcar(j); if (a[j] >= 4) this.cola.push(j)
      }
      if (a[i] >= 4) this.cola.push(i)
    }
  }
  relajar() { while (this.cola.length) this.paso(1e9); this.salidas.length = 0 }
  get llenado() { return this.llenas / this.total }
  /** Lo deja con aspecto de llenado `f` (0..1) echando granos en (x, y) o repartidos con `donde()`. */
  sembrar(f, donde) {
    let n = 0, antes = -1, quieto = 0
    while (this.llenado < f && n++ < 400 && quieto < 6) {
      if (donde) for (let k = 0; k < 40; k++) { const [x, y] = donde(); this.echar(4, x, y) } else this.echar(Math.max(16, this.total >> 4))
      this.relajar(); quieto = this.llenas === antes ? quieto + 1 : 0; antes = this.llenas
    }
    this.luz.fill(0)
  }
}

// ---------- Pintar (pixel art: la grilla a su tamaño y escalada sin suavizar) ----------
function pintar(ctx, p, x, y, cel, { oscuro = 0 } = {}) {
  if (!p.cv) { p.cv = document.createElement('canvas'); p.cv.width = p.w; p.cv.height = p.h; p.g = p.cv.getContext('2d'); p.img = p.g.createImageData(p.w, p.h) }
  const d = p.img.data
  for (let i = 0, o = 0; i < p.a.length; i++, o += 4) {
    if (!p.toc[i] || !p.dentro[i]) { d[o + 3] = 0; continue }
    let c = PRGB[Math.min(p.a[i], 3)]
    const l = p.luz[i]
    if (l > 0.02) { c = mezcla(c, [255, 250, 235], l * 0.35); p.luz[i] = l * 0.8 }
    if (oscuro) c = mezcla(c, [4, 6, 13], oscuro)
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255
  }
  p.g.putImageData(p.img, 0, 0)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(p.cv, Math.round(x), Math.round(y), p.w * cel, p.h * cel)
}

// Material de la losa según cuánto se llenó: hielo claro → sedimento compacto y más hondo de color.
const HIELO = [159, 227, 245], SED = [122, 78, 40], SED_H = [40, 24, 14]
function losa(ctx, x, y, w, h, ll, { tope = false, esp = null, t = 0, margen = 6 } = {}) {
  const m = margen, e = esp ?? Math.round(5 + ll * 16)
  const cara = mezcla(HIELO, SED, ll), lado = mezcla([60, 110, 140], SED_H, ll)
  // espesor (la cara de adelante)
  let g = ctx.createLinearGradient(0, y + h + m, 0, y + h + m + e)
  g.addColorStop(0, css(mezcla(lado, [255, 255, 255], 0.08), 0.85)); g.addColorStop(1, css(mezcla(lado, [0, 0, 0], 0.5), 0.9))
  ctx.fillStyle = g; ctx.fillRect(x - m, y + h + m, w + 2 * m, e)
  // estratificado en el espesor: rayas de sedimento
  if (ll > 0.3) { ctx.fillStyle = css(SED, 0.25 * ll); for (let k = 1; k < e / 4; k++) ctx.fillRect(x - m, y + h + m + k * 4, w + 2 * m, 1) }
  // cara de arriba, translúcida
  g = ctx.createLinearGradient(x, y - m, x + w, y + h + m)
  g.addColorStop(0, css(cara, 0.16 + ll * 0.3)); g.addColorStop(1, css(mezcla(cara, [4, 6, 13], 0.5), 0.12 + ll * 0.35))
  ctx.fillStyle = g; ctx.fillRect(x - m, y - m, w + 2 * m, h + 2 * m)
  // arista especular
  ctx.fillStyle = 'rgb(234 246 255 / 0.5)'; ctx.fillRect(x - m, y - m, w + 2 * m, 1)
  ctx.fillStyle = 'rgb(234 246 255 / 0.18)'; ctx.fillRect(x - m, y - m, 1, h + 2 * m)
  ctx.fillStyle = 'rgb(234 246 255 / 0.3)'; ctx.fillRect(x - m, y + h + m, w + 2 * m, 1)
  if (tope) veta(ctx, x - m, y + h + m + e * 0.5, w + 2 * m, t)
}
// La veta brillante del estrato en su tope: una línea quebrada que respira lento.
function veta(ctx, x, y, w, t) {
  ctx.save()
  ctx.strokeStyle = `rgb(194 168 255 / ${0.65 + 0.25 * Math.sin(t / 900)})`; ctx.shadowColor = '#9b7bff'; ctx.shadowBlur = 8; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(x, y)
  for (let k = 1; k <= 24; k++) ctx.lineTo(x + (w * k) / 24, y + (hash(k, 3) - 0.5) * 3)
  ctx.stroke(); ctx.restore()
}

// Roca oscura, en pixel art, con el costo grabado.
const ROCAS = {}
function roca(ctx, x, y, w, h, e, { cel = 4, t = 0, grieta = 0 } = {}) {
  const clave = `${w}x${h}x${cel}`
  if (!ROCAS[clave]) {
    const cv = document.createElement('canvas'), cw = Math.ceil(w / cel), ch = Math.ceil(h / cel)
    cv.width = cw; cv.height = ch
    const g = cv.getContext('2d'), tonos = ['#0b0e14', '#10141c', '#151a24', '#1b2130', '#0d1017']
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const r = hash(i * 7.1 + j * 131.3, 2), capa = Math.sin(j * 0.9 + Math.sin(i * 0.13) * 1.6)
      g.fillStyle = tonos[Math.min(4, Math.floor(r * 3 + (capa > 0.6 ? 1.5 : 0)))]; g.fillRect(i, j, 1, 1)
    }
    ROCAS[clave] = cv
  }
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(ROCAS[clave], x, y, Math.ceil(w / cel) * cel, Math.ceil(h / cel) * cel)
  ctx.fillStyle = 'rgb(255 255 255 / 0.06)'; ctx.fillRect(x, y, w, 1)
  ctx.fillStyle = 'rgb(0 0 0 / 0.5)'; ctx.fillRect(x, y + h - 2, w, 2)
  if (grieta) { // grietas en pixel: el estrato que se puede abrir ya empieza a romperse
    ctx.fillStyle = `rgb(159 227 245 / ${0.35 + 0.2 * Math.sin(t / 700)})`
    let cx = x + w * 0.5, cy = y
    for (let k = 0; k < h / 3; k++) { ctx.fillRect(Math.round(cx), Math.round(cy), 2, 3); cx += (hash(k, 9) - 0.5) * 8; cy += 3 }
  }
  if (e.costo) grabar(ctx, x + w / 2, y + h / 2, e, Math.min(13, h * 0.32))
}
function grabar(ctx, cx, cy, e, tam) {
  ctx.save(); ctx.font = `600 ${tam}px 'Space Grotesk'`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const txt = `Estrato ${e.n}   ·   ${e.costo}`
  ctx.fillStyle = 'rgb(0 0 0 / 0.8)'; ctx.fillText(txt, cx, cy - 1)
  ctx.fillStyle = 'rgb(234 246 255 / 0.1)'; ctx.fillText(txt, cx, cy + 1)
  ctx.fillStyle = 'rgb(159 190 215 / 0.42)'; ctx.fillText(txt, cx, cy)
  const ancho = ctx.measureText(txt).width
  cristal(ctx, cx + ancho / 2 + tam * 0.75, cy, tam * 0.5, 0.42)
  ctx.restore()
}
function cristal(ctx, x, y, r, a = 1) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a
  ctx.fillStyle = '#9fe3f5'; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.55, -r * 0.5); ctx.lineTo(r * 0.55, r * 0.5); ctx.lineTo(0, r); ctx.lineTo(-r * 0.55, r * 0.5); ctx.lineTo(-r * 0.55, -r * 0.5); ctx.fill()
  ctx.restore()
}

// La base de la pila principal vista desde abajo: el mandala en sombra, con su aro de 1 px y la arena escurriéndose por el centro.
let MADRE
function pilaMadre() {
  if (MADRE) return MADRE
  MADRE = new Pila(101, 101, { disco: true }); MADRE.echar(26000); MADRE.relajar(); MADRE.luz.fill(0)
  return MADRE
}
function pintarMadre(ctx, cx, cy, r, { achatar = 1, oscuro = 0.45 } = {}) {
  const p = pilaMadre(), cel = (2 * r) / p.w
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, achatar)
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r + 30, 0, Math.PI * 2); ctx.fillStyle = 'rgb(159 227 245 / 0.05)'; ctx.fill(); ctx.restore()
  pintar(ctx, p, -r, -r, cel, { oscuro })
  // sombra de abajo: más oscuro hacia el centro (lo tapa la propia pila), luz fría en el borde
  const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r)
  g.addColorStop(0, 'rgb(4 6 13 / 0.55)'); g.addColorStop(0.85, 'rgb(4 6 13 / 0.1)'); g.addColorStop(1, 'rgb(4 6 13 / 0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgb(234 246 255 / 0.55)'; ctx.lineWidth = 1 / achatar; ctx.beginPath(); ctx.arc(0, 0, r + 1.5, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
}

// ---------- Granos en el aire: van de un estrato al otro y, al llegar, se echan en la pila de destino ----------
const AIRE = []
function lanzar(x0, y0, x1, y1, { dur = 600, arco = 0, al = null, tam = 3, c = null } = {}) {
  if (AIRE.length > 420) { al?.(); return }
  AIRE.push({ x0, y0, x1, y1, dur, arco, al, tam, t: 0, c: c ?? PILA[2 + (Math.random() < 0.5 ? 1 : 0)] })
}
function aire(ctx, dt) {
  for (let k = AIRE.length - 1; k >= 0; k--) {
    const g = AIRE[k]; g.t += dt / g.dur
    if (g.t >= 1) { AIRE.splice(k, 1); g.al?.(); continue }
    const u = g.arco ? g.t : g.t * g.t // caída: acelera; salto: parábola
    const x = g.x0 + (g.x1 - g.x0) * u, y = g.y0 + (g.y1 - g.y0) * u - g.arco * Math.sin(Math.PI * g.t)
    ctx.fillStyle = g.c; ctx.fillRect(Math.round(x), Math.round(y), g.tam, g.tam)
  }
}

// ---------- Lienzo y bucle (simulación a 20 pasos por segundo, dibujo a rAF) ----------
function lienzo(cont, alCambiar) {
  const cv = document.createElement('canvas'); cont.appendChild(cv)
  const ctx = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1)
  const L = { cv, ctx, W: 0, H: 0 }
  const ajustar = () => { L.W = cont.clientWidth; L.H = cont.clientHeight; cv.width = L.W * dpr; cv.height = L.H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); alCambiar?.(L) }
  new ResizeObserver(ajustar).observe(cont); ajustar()
  return L
}
function bucle(paso, dibujar) {
  let acc = 0, prev = performance.now()
  function f(t) {
    const dt = Math.min(100, t - prev); prev = t; acc += dt
    while (acc >= 50) { paso(); acc -= 50 }
    dibujar(t, dt); requestAnimationFrame(f)
  }
  requestAnimationFrame(f)
}

// ---------- Marco de Cristalización ----------
const CRISTAL_SVG = `<path d="M0-11 5.5-6V6L0 11-5.5 6V-6Z" fill="#0f3a4d"/><path d="M0-11-5.5-6V6L0 11Z" fill="#9fe3f5" opacity="0.35"/><path d="M0-11 5.5-6V6L0 11Z" fill="#9fe3f5" opacity="0.7"/><path d="M0-11 5.5-6 0-3.5-5.5-6Z" fill="#eaf6ff" opacity="0.85"/><path d="M0-3.5V11M0-11-5.5-6V6L0 11 5.5 6V-6Z" fill="none" stroke="#eaf6ff" stroke-width="0.6" stroke-linejoin="round" opacity="0.8"/>`
const PEST = [['Red', 'M0-7 7 0 0 7-7 0ZM-3.5-3.5 3.5 3.5M3.5-3.5-3.5 3.5'], ['Estratos', 'M-7-6.5h14l-1.5 3h-11ZM-6-1h12l-1.5 3h-9ZM-5 4.5h10l-1.5 3h-7Z'],
  ['Defectos', 'M-7-3.5h14M-7 3.5h14M-3.5-7V7M3.5-7V0M1.5 0V7'], ['Escarcha', 'M0-7V7M-6-3.5 6 3.5M-6 3.5 6-3.5M0-7-1.5-5.5M0-7 1.5-5.5M0 7-1.5 5.5M0 7 1.5 5.5'],
  ['Relicario', 'M-6-2.5-3.5-6h7L6-2.5 0 7ZM-6-2.5H6M-3.5-6-1.5-2.5 0 7M3.5-6 1.5-2.5 0 7']]
function marco() {
  const arena = [[-1.3, -2.8, 1], [1.7, -2.8, 0.7], [-2.8, 0.2, 0.9], [0.2, 0.2, 1], [3.2, 0.2, 0.75], [-5.8, 3.2, 0.7], [-2.8, 3.2, 0.85], [0.2, 3.2, 0.65], [3.2, 3.2, 0.9], [6.2, 3.2, 0.6], [-8.8, 6.2, 0.55], [-5.8, 6.2, 0.75], [-2.8, 6.2, 0.6], [0.2, 6.2, 0.8], [3.2, 6.2, 0.55], [6.2, 6.2, 0.7], [9.2, 6.2, 0.5]]
    .map(([x, y, o]) => `<rect x="${x}" y="${y}" width="2.6" height="2.6" fill="#ffb547" opacity="${o}"/>`).join('')
  document.body.insertAdjacentHTML('afterbegin', `<nav class="capas">
    <button><svg viewBox="-12 -12 24 24">${arena}</svg><span>Arena</span></button>
    <button class="cristal" aria-current="page"><svg viewBox="-12 -12 24 24">${CRISTAL_SVG}</svg><span>Cristalización</span></button></nav>`)
  document.querySelector('.cristalizacion').insertAdjacentHTML('afterbegin', `<dl class="contadores num">
      <div class="principal"><svg class="emblema" viewBox="-12 -12 24 24" aria-hidden="true">${CRISTAL_SVG}<path d="M7.5-9.5v4M5.5-7.5h4" stroke="#fff" stroke-width="0.8" stroke-linecap="round"/></svg>
        <div><dt>Cristales</dt><dd class="cristales">5.571</dd></div></div>
      <div><dt>Cristales totales</dt><dd>2,75e6</dd></div>
      <div><dt>Energía · Arena</dt><dd>8,54e60</dd></div>
    </dl>
    <nav class="sistemas pestanas-hielo">${PEST.map(([t, d], i) => `<button ${i === 1 ? 'aria-current="page"' : ''}><svg viewBox="-8 -8 16 16"><path d="${d}"/></svg><span class="nombre">${t}</span></button>`).join('')}</nav>`)
}

const PRESION_HTML = `<div class="presion num"><span class="et">Presión</span><b>1,64</b><small>cada derrumbe vale <b>×77</b></small><small>×10^(1,64 × Densidad 1,15)</small></div>`

const GOTAS = `<svg class="ic" viewBox="-12 -12 24 24" fill="none" stroke="#9fe3f5" stroke-width="1.2" stroke-linejoin="round">
  <path d="M-4-10c-2.6 3.6-4 5.8-4 7.6a4 4 0 0 0 8 0c0-1.8-1.4-4-4-7.6Z" fill="rgb(159 227 245 / 0.22)"/>
  <path d="M5-3c-1.8 2.5-2.8 4-2.8 5.3a2.8 2.8 0 0 0 5.6 0C7.8 1 6.8-.5 5-3Z" fill="rgb(159 227 245 / 0.14)"/>
  <path d="M-3 5.5c-1.2 1.6-1.8 2.6-1.8 3.4a1.8 1.8 0 0 0 3.6 0c0-.8-.6-1.8-1.8-3.4Z" fill="rgb(159 227 245 / 0.1)"/>
  <path d="M-5.6-3.4a2 2 0 0 0 1 1.9" stroke="#eaf6ff" opacity="0.8"/></svg>`
const PRENSA = `<svg class="ic" viewBox="-12 -12 24 24" fill="none" stroke="#ffb547" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">
  <path d="M-9-10H9M0-10v6"/><rect x="-7" y="-4" width="14" height="3" fill="rgb(255 181 71 / 0.35)"/>
  <path d="M-3-8h6" stroke-width="1"/><path d="M-9 2h18M-9 5.5h18M-9 9h18" stroke="#c99a5b" opacity="0.8"/><path d="M-10-10v20M10-10v20" opacity="0.5"/></svg>`
const CRISTALITO = `<svg viewBox="-6 -6 12 12"><path d="M0-6 3-3V3L0 6-3 3V-3Z" fill="currentColor"/></svg>`

function fichaHTML(e, { que = true, desglose = true } = {}) {
  return `<header class="cab"><button class="flecha" ${e.n === 1 ? 'disabled' : ''} aria-label="Estrato de arriba">↑</button><h2>Estrato ${e.n}</h2><button class="flecha" aria-label="Estrato de abajo">↓</button></header>
  ${e.tope ? '<p class="estado"><i></i>Lleno hasta el tope<i></i></p>' : ''}
  <div class="cifras num">
    <div><span class="et">Granos</span><b class="grande">${e.granos}</b><span class="sub">×${e.ritmo} por minuto</span></div>
    <div><span class="et">Aporte a la Presión</span><b class="grande hielo">×${e.aporte}</b><span class="sub">+${e.p} a la Presión</span></div>
  </div>
  ${desglose ? `<div class="desglose num"><span class="et">Velocidad local</span><ul><li>Flujo <b>×1,1</b></li><li>Permeabilidad <b>×${e.permX[0]}</b></li><li>Red · Estratos <b>×2</b></li><li>Caudal <b>×0,61</b></li></ul></div>` : ''}
  <button class="mejora perm gema">${GOTAS}<span><span class="nom">Permeabilidad <span>nv ${e.perm}</span></span><span class="ef num"><b>×${e.permX[0]} → ×${e.permX[1]}</b> de flujo</span><span class="ef num">× (1 + 0,3 × nivel)</span></span><span class="costo num">${e.cPerm}${CRISTALITO}</span></button>
  <button class="mejora pres">${PRENSA}<span><span class="nom">Presión <span>nv ${e.pres}</span></span><span class="ef num"><b>×${e.presX[0]} → ×${e.presX[1]}</b> de peso</span><span class="ef num">× (1 + 0,25 × nivel)</span></span><span class="costo num">${e.cPres}${CRISTALITO}</span></button>
  ${que ? '<p class="que">La arena que se escurre de la pila cae al estrato 1; lo que se derrumba por su borde cae al de abajo. Cuanto más llenos y más profundos, más Presión.</p>' : ''}`
}
