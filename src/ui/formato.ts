import Decimal from 'break_infinity.js'

/** SPEC 8: hasta 999.999 con separador de miles; después científica con 2 decimales (1,23e45). */
export function formato(x: Decimal | number): string {
  const d = new Decimal(x)
  if (d.lt(1e6)) return Math.floor(d.toNumber()).toLocaleString('es-AR')
  let m = d.mantissa.toFixed(2)
  let e = d.exponent
  if (m === '10.00') { m = '1.00'; e++ }
  return `${m.replace('.', ',')}e${e}`
}
