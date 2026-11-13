// Worker de la pila visual: recibe cuántos granos soltar y devuelve qué se derrumbó.
import { LADO, LOTE, Pila } from './pila'
import url from '../assets/pilas.bin?url'
import FOTOS from '../assets/pilas.json'

/** foto ≥ 0: en vez de soltar, carga esa foto de la pila (scripts/snapshots.mjs). */
export interface Pedido {
  granos: number; reiniciar: boolean; gen: number; foto: number
  /** ms de trabajo de este pedido (I11: menos con la pila llena y "Ahorrar batería"). */
  presupuesto: number
  /** El arreglo de alturas de una respuesta anterior, ya usado: se reusa en vez de crear uno nuevo (I11). */
  devuelto?: Uint8Array
}
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
  /**
   * Avalanchas de un grano solo (derrumbes de cada una): uno por pedido se suelta aparte y se mide hasta que la pila
   * vuelve a estar estable. Es una muestra de la distribución real (la ley de potencias); el resto va en tandas.
   */
  muestras: number[]
  /** Las fotos no se pudieron cargar (sin red, sin DecompressionStream): no pedir más, soltar granos al ritmo máximo. */
  sinFotos?: boolean
}

const TOPE = 50_000 // derrumbes entre dos miradas al reloj (~1 ms)

let pila = new Pila()
let midiendo = false // el grano de muestra todavía se está derrumbando (puede seguir en el próximo pedido)
let muestra = 0
// null si fallan (I6): sin esto el pedido de foto no contesta nunca y la pila queda congelada.
const fotos: Promise<Uint8Array | null> = fetch(url)
  .then((r) => { if (!r.ok) throw new Error(`pilas.bin: ${r.status}`); return new Response(r.body!.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer() })
  .then((b) => new Uint8Array(b))
  .catch((e) => { console.warn(e); return null })

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

let libres: Uint8Array[] = []
/** Una copia de las alturas en un arreglo reusado si hay (sin basura de 263 KB por respuesta). */
function copiaAlturas() {
  const a = libres.pop() ?? new Uint8Array(pila.h.length)
  a.set(pila.h)
  return a
}

onmessage = async (e: MessageEvent<Pedido>) => {
  const { granos, reiniciar, gen, foto, presupuesto, devuelto } = e.data
  if (devuelto?.length === pila.h.length) libres = [devuelto]
  if (foto >= 0) {
    const t0 = performance.now()
    const q = await fotos
    if (!q) {
      const r: Respuesta = { gen, foto: -1, hechos: 0, tamano: 0, celdas: new Int32Array(0), alturas: copiaAlturas(), radio: pila.radio, perdidos: pila.perdidos, estable: pila.estable, ms: 0, muestras: [], sinFotos: true }
      postMessage(r, { transfer: [r.alturas.buffer] })
      return
    }
    midiendo = false // M12: la muestra a medias era de la pila de antes
    const celdas = cargar(q, foto)
    const alturas = copiaAlturas()
    const r: Respuesta = { gen, foto, hechos: 0, tamano: 0, celdas, alturas, radio: pila.radio, perdidos: 0, estable: true, ms: performance.now() - t0, muestras: [] }
    postMessage(r, { transfer: [celdas.buffer, alturas.buffer] })
    return
  }
  if (reiniciar) (pila = new Pila()), (midiendo = false)
  const t0 = performance.now()
  let hechos = 0, tamano = 0, muestreado = false
  const muestras: number[] = []
  do {
    if (pila.estable) {
      if (midiendo) muestras.push(muestra), (midiendo = false)
      if (hechos >= granos) break
      // El primer grano de cada pedido va solo, para medir su avalancha.
      const n = muestreado ? Math.min(granos - hechos, LOTE) : 1
      if (!muestreado) (midiendo = muestreado = true), (muestra = 0)
      pila.soltar(n)
      hechos += n
    }
    const d = pila.estabilizar(TOPE)
    tamano += d
    if (midiendo) muestra += d
  } while (performance.now() - t0 < presupuesto)
  const celdas = pila.tomarCeldas()
  const alturas = copiaAlturas()
  const r: Respuesta = {
    gen, foto, hechos, tamano, celdas, alturas,
    radio: pila.radio, perdidos: pila.perdidos, estable: pila.estable, ms: performance.now() - t0, muestras,
  }
  postMessage(r, { transfer: [celdas.buffer, alturas.buffer] })
}
