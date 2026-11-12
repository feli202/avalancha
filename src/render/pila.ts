// Pila de arena abeliana de la pantalla (SPEC 6.3 y 8). Pura: sin DOM ni tiempo, la usan el worker y el test.
export const LADO = 513
export const CENTRO = (LADO >> 1) * (LADO + 1)
/** Máximo de granos por llamada a soltar(): 3 + 252 entra en un byte. */
export const LOTE = 252

const TAM = LADO * LADO
const MASCARA = (1 << 19) - 1 // cola circular; 2^19 > TAM y cada celda está a lo sumo una vez
const TOCADA = 1, BORDE = 2

export class Pila {
  /** Granos por celda. Mientras `estable` es false puede haber celdas con 4 o más. */
  readonly h = new Uint8Array(TAM)
  /** Derrumbes acumulados. */
  derrumbes = 0
  /** Granos que cayeron al sumidero del borde. */
  perdidos = 0
  /** Distancia al centro de la celda más lejana que se derrumbó. */
  radio = 0
  estable = true

  private cola = new Int32Array(MASCARA + 1)
  private ini = 0
  private fin = 0
  /** Por celda: TOCADA (se derrumbó desde el último tomarCeldas) | BORDE (sumidero). */
  private meta = new Uint8Array(TAM)
  private celdas = new Int32Array(TAM)
  private sumidero: number[] = []

  constructor() {
    for (let k = 0; k < LADO; k++) this.sumidero.push(k, TAM - 1 - k, k * LADO, k * LADO + LADO - 1)
    for (const b of this.sumidero) this.meta[b] = BORDE
  }

  /** Suelta n granos (n ≤ LOTE) en el centro. Solo con la pila estable; después hay que estabilizar(). */
  soltar(n: number) {
    const v = this.h[CENTRO]
    this.h[CENTRO] = v + n
    if (v + n < 4) return
    this.cola[this.fin] = CENTRO
    this.fin = (this.fin + 1) & MASCARA
    this.estable = false
  }

  /**
   * Derrumba hasta `tope` celdas de la cola (una avalancha grande se reparte entre cuadros) y devuelve
   * los derrumbes.
   * - Cola FIFO y no pila LIFO: con FIFO, entre que una celda entra y sale de la cola cada vecina se
   *   derrumba a lo sumo una vez (≤ 63 granos), así que ninguna celda pasa de 255 y alcanza un Uint8Array.
   *   De paso la avalancha avanza como una onda desde el centro.
   * - Sin saltos condicionales adentro del bucle (son impredecibles y lo dejaban a la mitad de velocidad):
   *   la vecina se escribe siempre en la cola y `fin` avanza solo si cruzó de <4 a ≥4.
   * - Una celda del borde sale de la cola con k = 0: se traga los granos.
   */
  estabilizar(tope = Infinity): number {
    const { h, cola, meta } = this
    let { ini, fin } = this
    let total = 0, tragados = 0
    for (; ini !== fin && tope > 0; tope--) {
      const i = cola[ini]
      ini = (ini + 1) & MASCARA
      const v = h[i], m = meta[i]
      const k = (v >> 2) & ((m >> 1) - 1)
      tragados += (v >> 2) - k
      h[i] = v & 3
      meta[i] = m | TOCADA
      total += k
      let j = i + 1, w = h[j]
      h[j] = w + k; cola[fin] = j; fin = (fin + (((w - 4) & (3 - w - k)) >>> 31)) & MASCARA
      j = i - 1; w = h[j]
      h[j] = w + k; cola[fin] = j; fin = (fin + (((w - 4) & (3 - w - k)) >>> 31)) & MASCARA
      j = i + LADO; w = h[j]
      h[j] = w + k; cola[fin] = j; fin = (fin + (((w - 4) & (3 - w - k)) >>> 31)) & MASCARA
      j = i - LADO; w = h[j]
      h[j] = w + k; cola[fin] = j; fin = (fin + (((w - 4) & (3 - w - k)) >>> 31)) & MASCARA
    }
    this.ini = ini
    this.fin = fin
    this.estable = ini === fin
    this.perdidos += tragados * 4
    if (this.estable)
      for (const b of this.sumidero) { this.perdidos += h[b]; h[b] = 0 } // restos (<4) que no entraron en la cola
    this.derrumbes += total
    return total
  }

  /** Celdas que se derrumbaron desde la última llamada (sin repetir, sin el sumidero). */
  tomarCeldas(): Int32Array {
    const { meta, celdas } = this
    const c = LADO >> 1
    let n = 0, r2 = 0
    for (let y = 1; y < LADO - 1; y++)
      for (let x = 1, i = y * LADO + 1; x < LADO - 1; x++, i++)
        if (meta[i]) {
          meta[i] = 0
          celdas[n++] = i
          r2 = Math.max(r2, (x - c) * (x - c) + (y - c) * (y - c))
        }
    this.radio = Math.max(this.radio, Math.sqrt(r2))
    return celdas.slice(0, n)
  }
}
