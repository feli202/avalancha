import Decimal from 'break_infinity.js'
import { ajustes } from './ajustes.svelte'
import { es } from '../strings/es'

/**
 * SPEC 8: hasta 999.999 con separador de miles; después científica con 2 decimales (1,23e45),
 * o de ingeniería si lo piden los ajustes (exponente múltiplo de 3: 12,30e45).
 */
export function formato(x: Decimal | number): string {
  const d = new Decimal(x)
  if (d.lt(1e6)) return Math.floor(d.toNumber()).toLocaleString('es-AR')
  const paso = ajustes.notacion === 'ingenieria' ? 3 : 1
  const r = ((d.exponent % paso) + paso) % paso
  let e = d.exponent - r
  let m = (d.mantissa * 10 ** r).toFixed(2)
  if (Number(m) >= 10 ** paso) { m = (Number(m) / 10 ** paso).toFixed(2); e += paso } // 9,999 → 10,00 → 1,00
  return `${m.replace('.', ',')}e${e}`
}

/** Multiplicadores y valores chicos con decimales (×1,56); desde 1.000, como `formato`. */
export function formatoMult(x: Decimal | number): string {
  const d = new Decimal(x)
  return d.lt(1000) ? d.toNumber().toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : formato(d)
}

/** Para lectores de pantalla: "1,23e45" se lee "1,23 por diez a la 45". */
export const hablado = (texto: string) => texto.replace(/(\d+(?:,\d+)?)e(\d+)/g, (_, m, e) => es.potencia(m, e))
