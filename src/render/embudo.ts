// Correcciones Capa 1, bloque 11 (en 2D): el embudo de los Estratos, simulado de verdad (decorativo, no toca la economía).
// Una sola grilla de arena que cae: cada grano conserva su color (un índice de la paleta equipada) y se mueve con
// gravedad y deslizamiento a 45°. Los estratos son bandejas cada vez más angostas, unidas por paredes en diagonal; el piso
// de cada una tiene poros que se abren cuando la bandeja pasa su nivel, así que la arena gotea a la de abajo, se mezcla
// y, si la de abajo está llena, se acumula y frena a la de arriba. Sin DOM: corre en estratos.worker.ts y en los tests.

export const ANCHO = 120
export const BANDAS = 8
const ARRIBA = 4 // filas sobre la primera bandeja: por ahí cae el chorro de la pila
const ALTO_BANDA = 6 // filas de arena de cada bandeja
const CAIDA = 4 // por banda la bandeja se angosta 2 × CAIDA columnas; la pared diagonal ocupa CAIDA filas
const ANCHO_0 = 114
const PASO_BANDA = ALTO_BANDA + 1 + CAIDA
export const ALTO = ARRIBA + BANDAS * PASO_BANDA

export const VACIO = 0
// 1..4: arena del color 0..3 de la paleta. Las celdas fijas van en `muro`.
export const PARED = 1, PORO = 2, ROCA = 3

export interface Banda {
  /** Primera fila de arena y fila del piso. */
  y: number; piso: number
  /** Primera y última columna de arena. */
  a: number; b: number
}

export const banda = (k: number): Banda => {
  const w = ANCHO_0 - 2 * CAIDA * k, a = (ANCHO - w) >> 1, y = ARRIBA + k * PASO_BANDA
  return { y, piso: y + ALTO_BANDA, a, b: a + w - 1 }
}
export const capacidad = (k: number) => { const b = banda(k); return (b.b - b.a + 1) * ALTO_BANDA }

/** ¿Esta columna del piso es un poro? Uno cada 7, más el cuello del centro. */
export const esPoro = (x: number) => x % 7 === 3 || Math.abs(x - (ANCHO >> 1)) < 1

/** Paredes, poros (cerrados) y la roca de los estratos cerrados. Lo usan la física y el dibujo. */
export function armarMuro(m: Uint8Array, abiertos: number) {
  m.fill(VACIO)
  for (let k = 0; k < BANDAS; k++) {
    const b = banda(k)
    for (let y = b.y; y <= b.piso; y++) { m[y * ANCHO + b.a - 1] = PARED; m[y * ANCHO + b.b + 1] = PARED }
    for (let x = b.a - 1; x <= b.b + 1; x++) m[b.piso * ANCHO + x] = esPoro(x) && x >= b.a && x <= b.b ? PORO : PARED
    // pared diagonal: del borde del piso hacia adentro, hasta la bandeja de abajo
    for (let i = 1; i <= CAIDA; i++) { m[(b.piso + i) * ANCHO + b.a - 1 + i] = PARED; m[(b.piso + i) * ANCHO + b.b + 1 - i] = PARED }
    if (k >= abiertos) for (let y = b.y; y < b.piso; y++) for (let x = b.a; x <= b.b; x++) m[y * ANCHO + x] = ROCA
  }
  // el embudo de arriba: paredes que bajan hasta la primera bandeja
  const b0 = banda(0)
  for (let y = 0; y < b0.y; y++) { m[y * ANCHO + b0.a - 1] = PARED; m[y * ANCHO + b0.b + 1] = PARED }
}

export class Embudo {
  /** 0 vacío, 1..4 arena (color + 1). */
  readonly celdas = new Uint8Array(ANCHO * ALTO)
  /** 0 libre, PARED, PORO (pared que se abre), ROCA (estrato cerrado). */
  readonly muro = new Uint8Array(ANCHO * ALTO)
  /** Granos de arena dentro de cada bandeja (las filas de arena, no la diagonal de abajo). */
  readonly cuentas = new Array<number>(BANDAS).fill(0)
  /** Poros abiertos de cada bandeja (para dibujarlos huecos). */
  readonly poros = new Array<boolean>(BANDAS).fill(false)
  /** Fracción de la capacidad que cada bandeja quiere tener; por encima, abre los poros. */
  objetivo = new Array<number>(BANDAS).fill(0)
  abiertos = 0
  private impar = false

  constructor(private azar: () => number = Math.random) { armarMuro(this.muro, 0) }

  /** Cuántas bandejas están abiertas; las cerradas se llenan de roca (y lo que cae sobre la roca se pierde). */
  abrir(n: number) {
    this.abiertos = n
    armarMuro(this.muro, n)
    for (let i = 0; i < this.celdas.length; i++) if (this.muro[i]) this.celdas[i] = VACIO
  }

  /** Deja la bandeja k con `n` granos ya asentados, de colores mezclados, en una loma baja con el centro más alto. */
  llenar(k: number, n: number, color: () => number) {
    const b = banda(k), c = (b.a + b.b) / 2, alto = ALTO_BANDA
    const columna = (x: number, nivel: number) => Math.max(0, Math.min(alto, Math.round(nivel - Math.abs(x - c) / 6)))
    let nivel = 0, suma = 0
    while (nivel < alto + 20 && suma < n) { nivel += 0.25; suma = 0; for (let x = b.a; x <= b.b; x++) suma += columna(x, nivel) }
    for (let x = b.a; x <= b.b && n > 0; x++) for (let j = 0, h = columna(x, nivel); j < h && n > 0; j++) {
      const i = (b.piso - 1 - j) * ANCHO + x
      if (!this.celdas[i] && !this.muro[i]) { this.celdas[i] = color() + 1; n-- }
    }
  }

  /** Suelta `n` granos en la boca del embudo (el chorro que cae de la pila). */
  echar(n: number, color: () => number) {
    const c = ANCHO >> 1
    for (let k = 0; k < n; k++) {
      const x = c + Math.round((this.azar() - 0.5) * 4)
      if (!this.celdas[x]) this.celdas[x] = color() + 1
    }
  }

  /** Un paso de la física. Devuelve cuántos granos se perdieron sobre la roca. */
  paso(): number {
    const { celdas: c, muro: m } = this
    // Los poros de cada bandeja: abiertos si pasó su nivel.
    for (let k = 0; k < this.abiertos; k++) {
      const b = banda(k), abierto = this.cuentas[k] > this.objetivo[k] * capacidad(k)
      this.poros[k] = abierto
      for (let x = b.a; x <= b.b; x++) if (esPoro(x)) m[b.piso * ANCHO + x] = abierto ? VACIO : PORO
    }
    const libre = (i: number) => !c[i] && (!m[i] || m[i] === ROCA)
    let perdidos = 0
    this.impar = !this.impar
    for (let y = ALTO - 2; y >= 0; y--) {
      const der = (y & 1) === +this.impar // se alterna el sentido del barrido: sin esto la arena se carga a un lado
      for (let j = 0; j < ANCHO; j++) {
        const x = der ? j : ANCHO - 1 - j, i = y * ANCHO + x
        if (!c[i]) continue
        let dest = -1
        if (libre(i + ANCHO)) dest = i + ANCHO
        else {
          const lado = this.azar() < 0.5 ? 1 : -1
          for (const d of [lado, -lado]) {
            const nx = x + d
            // en diagonal solo si el costado también está libre (no se cuela entre dos paredes que se tocan en la esquina)
            if (nx >= 0 && nx < ANCHO && libre(i + d) && libre(i + ANCHO + d)) { dest = i + ANCHO + d; break }
          }
        }
        if (dest < 0) continue
        if (m[dest] === ROCA) { perdidos++; c[i] = VACIO; continue } // cae sobre un estrato cerrado: se filtra en la roca
        c[dest] = c[i]; c[i] = VACIO
      }
    }
    // la última fila no tiene adónde ir
    c.fill(VACIO, (ALTO - 1) * ANCHO)
    this.contar()
    return perdidos
  }

  contar() {
    for (let k = 0; k < BANDAS; k++) {
      const b = banda(k)
      let n = 0
      for (let y = b.y; y < b.piso; y++) for (let x = b.a; x <= b.b; x++) if (this.celdas[y * ANCHO + x]) n++
      this.cuentas[k] = n
    }
  }
}
