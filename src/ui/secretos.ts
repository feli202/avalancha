// Logros secretos (CFG.secretos): las condiciones. Sin DOM ni reloj propio: el tiempo (ms) entra como argumento.
// juego.svelte.ts las conecta con el bucle, la pila, la tienda, el teclado y la cámara.
import { CFG, type State , enInfinito } from '../core'

const S = CFG.secretos
const num = (k: string, campo: string) => S[k][campo] as number
const MIN = 60_000

/** Lo que tiene que sobrevivir a una recarga (va en el guardado). horas: el bit h prendido = se jugó a la hora local h. */
export interface Contadores { capturas: number; horas: number }
export const contadoresVacios = (): Contadores => ({ capturas: 0, horas: 0 })
const TODAS_LAS_HORAS = 2 ** 24 - 1

/** Capicúa: Caudal, Ámbar, Coral, Jade y Violeta, en ese orden, se leen igual al revés, con al menos N niveles distintos de cero. */
export function capicua(s: State) {
  const v = [s.caudal, ...s.colores]
  return v.filter((x) => x > 0).length >= num('capicua', 'distintos_de_cero') && v.every((x, i) => x === v[v.length - 1 - i])
}

/** Monocromo: la Energía pedida con Ámbar comprado y ningún otro color (los colores vuelven a 0 al comprimir). */
export const monocromo = (s: State) =>
  s.colores[0] > 0 && s.colores.slice(1).every((x) => x === 0) && s.energia.gte(10 ** num('monocromo', 'energia_log10'))

/** Volviste: entre el último guardado y ahora pasaron los días pedidos. */
export const volviste = (ahora: number, guardadoEn: number) => ahora - guardadoEn >= num('volviste', 'dias') * 24 * 60 * MIN

/**
 * Lo que se ve entre dos estados seguidos del bucle (o antes y después de comprimir a mano). No sirve para un salto
 * fuera de línea: ahí los autocompradores compran entre medio y `a` no dice qué pasó.
 * zoomMaxS: segundos reales con el zoom al máximo en la corrida de `a`.
 */
export function transicion(a: State, d: State, zoomMaxS: number): string[] {
  const r: string[] = []
  if (a.compresiones === d.compresiones && a.colores[1] === 0 && d.colores[1] > 0 && d.colores[0] === 0) r.push('conmutativo')
  if (d.compresiones > a.compresiones) {
    if (a.caudal === 0) r.push('minimalista')
    if (a.tiempoCorrida > 0 && zoomMaxS + num('microscopio', 'margen_s') >= a.tiempoCorrida) r.push('microscopio')
  }
  if (monocromo(d)) r.push('monocromo')
  return r
}

/** Los secretos que dependen de cuándo pasan las cosas: clics, quietud, avalanchas, teclas. */
export class Vigia {
  private clics: number[] = []
  /** Desde cuándo nadie toca nada con la pila a la vista (null: todavía no hubo cuadro). */
  private quieto: number | null = null
  private ultimoCuadro = 0
  /** Desde cuándo la Energía está al borde del Infinito (null: no lo está). */
  private alBorde: number | null = null
  private teclas: string[] = []
  private letras = ''
  /** Avalanchas de la corrida, para el promedio de Tormenta perfecta. */
  private suma = 0
  private cuenta = 0
  private corrida = -1

  /** ganar: se llama cada vez que se cumple una condición (también si ya estaba conseguido). */
  constructor(public c: Contadores, private ganar: (k: string) => void) {}

  /** Un clic o toque a la pila: cuentan todos, aunque el Puñado tenga tope. */
  clic(ms: number) {
    const ventana = num('galleta', 'segundos') * 1000
    this.clics.push(ms)
    while (ms - this.clics[0] > ventana) this.clics.shift()
    if (this.clics.length >= num('galleta', 'clics')) this.ganar('galleta')
    this.tocar(ms)
  }

  /** Cualquier toque, tecla o rueda. */
  tocar(ms: number) { this.quieto = ms }

  /**
   * Una vez por cuadro. aLaVista: la pila en pantalla (sin título ni paneles encima). hora: la hora local (0–23).
   * Un hueco de más de un segundo entre cuadros (pestaña oculta) cuenta como no estar mirando.
   */
  cuadro(ms: number, s: State, aLaVista: boolean, hora: number) {
    if (s.compresiones !== this.corrida) (this.corrida = s.compresiones), (this.suma = this.cuenta = 0)
    if (!aLaVista || this.quieto === null || ms - this.ultimoCuadro > 1000) this.quieto = ms
    else if (ms - this.quieto >= num('paciencia', 'minutos') * MIN) this.ganar('paciencia')
    this.ultimoCuadro = ms
    this.c.horas |= 1 << hora // el bucle no llama con la pestaña oculta ni en el título
    if (this.c.horas === TODAS_LAS_HORAS) this.ganar('insomnio')

    if (enInfinito(s) || s.energia.lt(10 ** num('borde', 'energia_log10'))) this.alBorde = null
    else if (this.alBorde === null) this.alBorde = ms

    else if (ms - this.alBorde >= num('borde', 'minutos') * MIN) this.ganar('borde')
  }

  /** Una avalancha de un grano solo (la misma muestra que el récord). */
  avalancha(n: number) {
    if (n >= num('anio1987', 'derrumbes')) this.ganar('anio1987')
    if (this.cuenta >= num('tormenta', 'muestras_min') && n >= (num('tormenta', 'veces_promedio') * this.suma) / this.cuenta) this.ganar('tormenta')
    this.suma += n
    this.cuenta++
  }

  /** Una tecla fuera de los campos de texto. Si termina una palabra de Arena (la lluvia va cada vez), su largo; si no, 0. */
  tecla(code: string, key: string) {
    const K = S.konami.teclas as string[]
    this.teclas = [...this.teclas, code].slice(-K.length)
    if (K.every((k, i) => this.teclas[i] === k)) this.ganar('konami')
    this.letras = (this.letras + (key.length === 1 ? key.toLowerCase() : ' ')).slice(-16)
    const palabra = (S.arena.palabras as string[]).find((p) => this.letras.endsWith(p))
    if (!palabra) return 0
    this.letras = ''
    this.ganar('arena')
    return palabra.length
  }

  /** Justo después de una compra a mano (clic o tecla, nunca un autocomprador). */
  compraManual(s: State) { if (capicua(s)) this.ganar('capicua') }

  /** Una foto del mandala con el botón de cámara. */
  captura() { if (++this.c.capturas >= num('fotografo', 'capturas')) this.ganar('fotografo') }
}


