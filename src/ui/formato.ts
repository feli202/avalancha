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

/** Multiplicadores y valores chicos con decimales (×1,56); desde 1.000, como `formato`. */
export function formatoMult(x: Decimal | number): string {
  const d = new Decimal(x)
  return d.lt(1000) ? d.toNumber().toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : formato(d)
}
