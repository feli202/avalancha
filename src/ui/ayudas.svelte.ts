// Ayuda integrada: el tooltip global (use:ayuda) y lo que dice cada mejora y número. Los textos, en src/strings.
import {
  CFG, aplicar, anillos, maxCascada, maxMutacion, caudal, densidad, multAnillos, multCascada, multColor, nivel, produccion, valor,
  type ItemId, type MutId, type State,
} from '../core'
import { txt } from '../strings'
import { formato, formatoMult } from './formato'

export interface Tip { titulo: string; que: string; ahora?: string; prox?: string }

/** El tooltip visible (lo dibuja Ayuda.svelte). `fn` se relee cada cuadro: "ahora" sigue al juego. */
export const tip = $state<{ actual: { fn: () => Tip; el: HTMLElement } | null }>({ actual: null })

const ESPERA_MOUSE = 350 // ms antes de mostrarlo al pasar el mouse
const ESPERA_TOQUE = 450 // ms de mantener presionado
const TOLERANCIA = 10 // px que se puede mover el dedo sin cancelar

/** Acción: tooltip al pasar el mouse, al mantener presionado (táctil) o con foco de teclado. */
export function ayuda(el: HTMLElement, fn: () => Tip) {
  let f = fn, t = 0, largo = false, x0 = 0, y0 = 0
  const mostrar = () => {
    tip.actual = { fn: () => f(), el }
    el.setAttribute('aria-describedby', 'ayuda-tip')
  }
  const ocultar = () => {
    clearTimeout(t)
    if (tip.actual?.el === el) tip.actual = null
    el.removeAttribute('aria-describedby')
  }
  const enter = (e: PointerEvent) => { if (e.pointerType === 'mouse') t = window.setTimeout(mostrar, ESPERA_MOUSE) }
  const leave = (e: PointerEvent) => { if (e.pointerType === 'mouse') ocultar() }
  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return ocultar()
    largo = false; x0 = e.clientX; y0 = e.clientY
    t = window.setTimeout(() => { largo = true; mostrar() }, ESPERA_TOQUE)
  }
  const move = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' && Math.hypot(e.clientX - x0, e.clientY - y0) > TOLERANCIA) clearTimeout(t)
  }
  const up = (e: PointerEvent) => { if (e.pointerType !== 'mouse') clearTimeout(t) }
  // Soltar después de mantener presionado no es un clic: no compra.
  const click = (e: MouseEvent) => { if (largo) { largo = false; e.preventDefault(); e.stopPropagation() } }
  const menu = (e: Event) => e.preventDefault()
  const focus = () => el.matches(':focus-visible') && mostrar()
  const ev: [string, EventListener, boolean?][] = [
    ['pointerenter', enter as EventListener], ['pointerleave', leave as EventListener], ['pointerdown', down as EventListener],
    ['pointermove', move as EventListener], ['pointerup', up as EventListener], ['pointercancel', up as EventListener],
    ['click', click as EventListener, true], ['contextmenu', menu], ['focus', focus], ['blur', ocultar],
  ]
  for (const [n, h, c] of ev) el.addEventListener(n, h, c)
  return {
    update: (g: () => Tip) => void (f = g),
    destroy: () => { ocultar(); for (const [n, h, c] of ev) el.removeEventListener(n, h, c) },
  }
}

// ---------- la tienda ----------
const mutDe = (id: ItemId) => (id.startsWith('mut_') ? (id.slice(4) as MutId) : null)
export const colorDe = (id: ItemId) => (id.startsWith('color') ? Number(id.slice(5)) : -1)

export const maximo = (s: State, id: ItemId) =>
  id === 'cascada' ? maxCascada(s) : mutDe(id) ? maxMutacion(s) : Infinity

export function nombre(id: ItemId) {
  const m = mutDe(id)
  return m ? txt.mutaciones[m] : id === 'cascada' ? txt.cascada : colorDe(id) >= 0 ? txt.colores[colorDe(id)] : txt.caudal
}

export function efecto(s: State, id: ItemId) {
  const m = mutDe(id)
  const n = nivel(s, id)
  if (m === 'expansion') return txt.efectoMutacion[m](formatoMult(CFG.anillos.mult_por_anillo + CFG.mutaciones[m].por_nivel * n))
  if (m === 'cascada') return txt.efectoMutacion[m](formatoMult(CFG.mutaciones[m].por_nivel * n))
  if (m) return txt.efectoMutacion[m](formato(CFG.mutaciones[m].por_nivel ** n))
  if (id === 'cascada') return txt.mult(formatoMult(multCascada(s)))
  if (colorDe(id) >= 0) return `${txt.mult(formatoMult(multColor(colorDe(id), n)))} · ${txt.alturaColor[colorDe(id)]}`
  return txt.efectoCaudal(formato(caudal(s)))
}

/** Cuánto multiplica a la Energía/s pasar de `s` a `t` (null si ahora no hay producción para comparar). */
const cambio = (s: State, t: State) => {
  const p = produccion(s)
  return p.gt(0) ? formatoMult(produccion(t).div(p)) : null
}

export function ayudaItem(s: State, id: ItemId): Tip {
  const g = txt.guia
  const t = aplicar(s, id)
  return {
    titulo: `${nombre(id)} · ${txt.nivel(nivel(s, id))}`,
    que: g.que[id],
    ahora: g.ahora(efecto(s, id)),
    prox: nivel(s, id) >= maximo(s, id) ? txt.nivelMaximo : g.proximo(efecto(t, id), cambio(s, t)),
  }
}

// ---------- números de la pantalla ----------
const n2 = (x: number) => formatoMult(x)

export const ayudaEnergia = (): Tip => ({ titulo: txt.energia, que: txt.guia.que.energia })

// I10: la Densidad no se nombra antes de la primera Compresión.
export const ayudaProduccion = (s: State): Tip => ({
  titulo: txt.guia.produccion,
  que: s.compresiones > 0 ? txt.guia.que.produccion : txt.guia.que.produccionSinDensidad,
  ahora: `${formato(caudal(s))} × (${n2(CFG.K_derrumbes_por_grano)} × ${formato(s.granos)}) × ${formatoMult(valor(s))}${s.compresiones > 0 ? `^${n2(densidad(s))}` : ''}`,
})

export function ayudaDensidad(s: State): Tip {
  const prox = s.compresiones < CFG.compresion.umbrales_log10.length
  return {
    titulo: txt.densidad,
    que: txt.guia.que.densidad,
    ahora: txt.guia.ahora(`^${n2(densidad(s))}`),
    prox: prox ? txt.guia.conCompresion(n2(densidad({ ...s, compresiones: s.compresiones + 1 }))) : undefined,
  }
}

export function ayudaAnillos(s: State): Tip {
  const a = anillos(s.granos)
  const paso = CFG.anillos.mult_por_anillo + CFG.mutaciones.expansion.por_nivel * s.mutaciones.expansion
  return {
    titulo: txt.anillos(a),
    que: txt.guia.que.anillos,
    ahora: txt.guia.ahora(txt.mult(formatoMult(multAnillos(s)))),
    prox: txt.guia.proximoAnillo(formato(CFG.anillos.granos_primer_anillo * 2 ** a), n2(paso)),
  }
}

export function ayudaComprimir(s: State): Tip {
  const prox = s.compresiones < CFG.compresion.umbrales_log10.length
  return {
    titulo: txt.comprimir,
    que: txt.guia.que.comprimir,
    ahora: txt.guia.ahora(`${txt.densidad} ^${n2(densidad(s))}`),
    prox: prox ? txt.guia.conCompresion(n2(densidad({ ...s, compresiones: s.compresiones + 1 }))) : undefined,
  }
}

export const ayudaSimple = (titulo: string, que: string, ahora?: string): Tip => ({ titulo, que, ahora })
