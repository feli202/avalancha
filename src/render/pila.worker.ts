// Worker de la pila visual: recibe cuántos granos soltar y devuelve qué se derrumbó.
import { LADO, LOTE, Pila } from './pila'
import url from '../assets/pilas.bin?url'
import FOTOS from '../assets/pilas.json'

/** foto ≥ 0: en vez de soltar, carga esa foto de la pila (scripts/snapshots.mjs). */
export interface Pedido { granos: number; reiniciar: boolean; gen: number; foto: number }
export interface Respuesta {
  gen: number
  /** La foto cargada, o -1. Con foto, `celdas` son las de adentro con 0 granos (no se derrumbaron ahora). */
  foto: number
  /** Granos que llegó a soltar (puede ser menos que lo pedido: el resto se vuelve a pedir). */
  hechos: number
  /** Derrumbes de este pedido: el tamaño de la avalancha del cuadro. */
  tamano: number
  /** Índices (y × 513 + x) de las celdas que se derrumbaron. */
  celdas: Int32Array
  alturas: Uint8Array
  radio: number
  perdidos: number
  /** false: quedó una avalancha a medias; sigue en el próximo pedido (aunque sea de 0 granos). */
  estable: boolean
  ms: number
}

const PRESUPUESTO_MS = 12 // por pedido: deja margen dentro de un cuadro de 16,7 ms
const TOPE = 50_000 // derrumbes entre dos miradas al reloj (~1 ms)

let pila = new Pila()
const fotos = fetch(url)
  .then((r) => new Response(r.body!.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer())
  .then((b) => new Uint8Array(b))

/** Arma la pila entera espejando el cuadrante guardado; devuelve las celdas de adentro con 0 granos. */
function cargar(q: Uint8Array, n: number): Int32Array {
  const Q = FOTOS.lado, C = LADO >> 1, base = n * Q * Q
  pila = new Pila()
  pila.radio = FOTOS.radio[n]
  const vacias: number[] = []
  for (let y = -C; y <= C; y++)
    for (let x = -C; x <= C; x++) {
      const v = q[base + Math.abs(y) * Q + Math.abs(x)], i = (C + y) * LADO + C + x
      if (v === 4) vacias.push(i)
      else pila.h[i] = v
    }
  return Int32Array.from(vacias)
}

onmessage = async (e: MessageEvent<Pedido>) => {
  const { granos, reiniciar, gen, foto } = e.data
  if (foto >= 0) {
    const t0 = performance.now()
    const celdas = cargar(await fotos, foto)
    const alturas = pila.h.slice()
    const r: Respuesta = { gen, foto, hechos: 0, tamano: 0, celdas, alturas, radio: pila.radio, perdidos: 0, estable: true, ms: performance.now() - t0 }
    postMessage(r, { transfer: [celdas.buffer, alturas.buffer] })
    return
  }
  if (reiniciar) pila = new Pila()
  const t0 = performance.now()
  let hechos = 0, tamano = 0
  do {
    if (pila.estable) {
      if (hechos >= granos) break
      const n = Math.min(granos - hechos, LOTE)
      pila.soltar(n)
      hechos += n
    }
    tamano += pila.estabilizar(TOPE)
  } while (performance.now() - t0 < PRESUPUESTO_MS)
  const celdas = pila.tomarCeldas()
  const alturas = pila.h.slice()
  const r: Respuesta = {
    gen, foto, hechos, tamano, celdas, alturas,
    radio: pila.radio, perdidos: pila.perdidos, estable: pila.estable, ms: performance.now() - t0,
  }
  postMessage(r, { transfer: [celdas.buffer, alturas.buffer] })
}
