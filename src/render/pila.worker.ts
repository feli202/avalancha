// Worker de la pila visual: recibe cuántos granos soltar y devuelve qué se derrumbó.
import { LOTE, Pila } from './pila'

export interface Pedido { granos: number; reiniciar: boolean; gen: number }
export interface Respuesta {
  gen: number
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

onmessage = (e: MessageEvent<Pedido>) => {
  const { granos, reiniciar, gen } = e.data
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
    gen, hechos, tamano, celdas, alturas,
    radio: pila.radio, perdidos: pila.perdidos, estable: pila.estable, ms: performance.now() - t0,
  }
  postMessage(r, { transfer: [celdas.buffer, alturas.buffer] })
}
