import Decimal from 'break_infinity.js'
import { ajustes } from './ajustes.svelte'
import { txt } from '../strings'
import { CFG } from '../core/config'

/** v1.0, bloque 4: todas las notaciones (Ajustes → Juego). El orden es el del selector. */
export const NOTACIONES = ['cientifica', 'ingenieria', 'letras', 'palabras', 'logaritmica', 'mixta',
  'pila', 'arena', 'romanos', 'binario', 'banda', 'ciego'] as const
export type Notacion = (typeof NOTACIONES)[number]

const LETRAS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'] // después aa, ab… (de a 1e3)
/** Granos de arena de todas las playas de la Tierra (estimación común). */
const ARENA_TIERRA = 7.5e18
/** "Una banda": desde qué log10 va cada texto de txt.formato.banda (el primero, el Infinito). */
const BANDA = [CFG.infinito_log10, 60, 20, 9, 4, 1, -1e9, -Infinity]
/** Jade = 0, Violeta = 1, Coral = 2, Ámbar = 3: los cuadraditos de la pila. */
const CUADROS = ['🟩', '🟪', '🟥', '🟧']

const dec = (s: string) => s.replace('.', txt.decimal)
/** log10 exacto también pasado 1e308 (Decimal guarda mantisa y exponente). */
const log10 = (d: Decimal) => d.exponent + Math.log10(d.mantissa)

/** m,mmeE con exponente múltiplo de `paso` (1: científica, 3: ingeniería). */
function cientifica(d: Decimal, paso: number): string {
  const r = ((d.exponent % paso) + paso) % paso
  let e = d.exponent - r
  let m = (d.mantissa * 10 ** r).toFixed(2)
  if (Number(m) >= 10 ** paso) { m = (Number(m) / 10 ** paso).toFixed(2); e += paso } // 9,999 → 10,00 → 1,00
  return `${dec(m)}e${e}`
}

/** Mantisa de un grupo de 3 órdenes (1,23 / 12,3 / 123) y el índice del grupo. */
function grupo(d: Decimal): [string, number] {
  let k = Math.floor(d.exponent / 3)
  let m = d.mantissa * 10 ** (d.exponent - 3 * k)
  if (Number(m.toPrecision(3)) >= 1000) { m /= 1000; k++ }
  return [dec(m.toFixed(m < 10 ? 2 : m < 100 ? 1 : 0)), k]
}

/** Sufijo de letras del grupo k: K…Dc y después aa, ab, …, zz, aaa… */
function sufijo(k: number): string {
  if (k < LETRAS.length) return LETRAS[k]
  let n = k - LETRAS.length, largo = 2
  while (n >= 26 ** largo) { n -= 26 ** largo; largo++ }
  let s = ''
  for (let i = 0; i < largo; i++) { s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26) }
  return s
}

function romano(n: number): string {
  const R: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let s = ''
  for (const [v, l] of R) while (n >= v) { s += l; n -= v }
  return s
}

function binario(d: Decimal): string {
  if (d.lt(2 ** 53)) return Math.floor(d.toNumber()).toString(2)
  const l2 = log10(d) / Math.log10(2)
  const e = Math.floor(l2)
  const m = Math.floor(2 ** (l2 - e) * 16) // 1 y 4 cifras binarias
  return `${m.toString(2).replace(/^1/, '1,'.replace(',', txt.decimal))}×2^${e.toString(2)}`
}

function palabras(d: Decimal): string {
  const tabla = txt.formato.palabras // [log10, singular, plural], de mayor a menor
  const l = log10(d)
  const fila = tabla.find(([e]) => l >= e)
  if (!fila || l >= tabla[0][0] + 3) return cientifica(d, 1) // más allá de los nombres
  const m = d.div(Decimal.pow10(fila[0])).toNumber()
  const t = m.toFixed(m < 10 ? 2 : m < 100 ? 1 : 0)
  return `${dec(t)} ${Number(t) === 1 ? fila[1] : fila[2]}`
}

/** El número con la notación elegida. Los costos van para arriba (M4): con 47,1 de Energía y un costo de 47,3 no se lee
 * "47" y "47" con la fila apagada. */
export function formato(x: Decimal | number, arriba = false, n: Notacion = ajustes.notacion as Notacion): string {
  const d = new Decimal(x)
  if (!Number.isFinite(d.mantissa) || !Number.isFinite(d.exponent)) return '—' // NaN o Infinity: no rompe la pantalla
  if (n === 'ciego') return '···'
  if (n === 'banda') { const l = d.lte(0) ? -Infinity : log10(d); return txt.formato.banda[BANDA.findIndex((e) => l >= e)] }
  const entero = (arriba ? Math.ceil : Math.floor)(d.lt(1e15) ? d.toNumber() : 0)
  if (n === 'romanos') {
    if (d.gte(4e6)) return txt.formato.roma
    if (entero === 0) return 'N' // nulla
    const miles = Math.floor(entero / 1000), resto = entero % 1000
    // Los miles sobrerrayados (vinculum); hasta 3999 se escriben con M.
    return entero < 4000 ? romano(entero) : [...romano(miles)].map((c) => c + '̅').join('') + romano(resto)
  }
  if (n === 'binario') return binario(d)
  if (n === 'arena') {
    const t = d.div(ARENA_TIERRA)
    return txt.formato.arena(t.gte(1) ? cientifica(t, 1) : t.gt(0) ? `${dec((t.mantissa).toFixed(2))}e${t.exponent}` : '0')
  }
  if (d.lt(n === 'letras' || n === 'mixta' ? 1000 : 1e6)) return entero.toLocaleString(txt.locale)
  switch (n) {
    case 'ingenieria': return cientifica(d, 3)
    case 'letras': { const [m, k] = grupo(d); return `${m}${sufijo(k)}` }
    case 'mixta': { if (d.exponent >= 33) return cientifica(d, 1); const [m, k] = grupo(d); return `${m}${sufijo(k)}` }
    case 'palabras': return palabras(d)
    case 'logaritmica': return `e${dec(log10(d).toFixed(2))}`
    case 'pila': {
      const [m, e] = cientifica(d, 1).split('e')
      return `${m}e${Number(e).toString(4).split('').map((c) => CUADROS[+c]).join('')}`
    }
    default: return cientifica(d, 1)
  }
}

/** Multiplicadores y valores chicos con decimales (×1,56); desde 1.000, como `formato`. */
export function formatoMult(x: Decimal | number): string {
  const d = new Decimal(x)
  const n = ajustes.notacion as Notacion
  if (n === 'ciego' || n === 'banda' || n === 'romanos' || n === 'binario' || n === 'arena' || n === 'pila') return formato(d)
  return d.lt(1000) ? d.toNumber().toLocaleString(txt.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : formato(d)
}

/** Para lectores de pantalla: "1,23e45" se lee "1,23 por diez a la 45". */
export const hablado = (texto: string) => texto.replace(/(\d+(?:[.,]\d+)?)e(\d+)/g, (_, m, e) => txt.potencia(m, e))
