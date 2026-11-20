// v1.0, bloque 1: un estado de la economía con NaN o Infinity no se acepta (ni en el bucle ni en el guardado).
import Decimal from 'break_infinity.js'

/** Primer campo con un número no finito (ej. "estado.energia"), o '' si todo es finito. Recorre el objeto entero. */
export function campoInvalido(x: unknown, ruta = 'estado'): string {
  if (typeof x === 'number') return Number.isFinite(x) ? '' : ruta
  if (x instanceof Decimal) return Number.isFinite(x.mantissa) && Number.isFinite(x.exponent) ? '' : ruta
  if (typeof x !== 'object' || x === null) return ''
  for (const [k, v] of Object.entries(x)) {
    const r = campoInvalido(v, `${ruta}.${k}`)
    if (r) return r
  }
  return ''
}
