import Decimal from 'break_infinity.js'
import { CFG } from './config'
import { produccion } from './formulas'
import type { State } from './state'
import { tick } from './tick'

export interface Ausencia {
  s: State
  /** Segundos simulados (ya con el tope). */
  segundos: number
  /** Energía producida en la ausencia (no la diferencia: las compras y las compresiones la gastan). */
  energia: Decimal
  compresiones: number
}

/** SPEC 8: el tiempo ausente con el mismo tick, en pasos de paso_s hasta max_pasos (después, pasos más largos). */
export function fueraDeLinea(s: State, segundos: number): Ausencia {
  const { paso_s, max_pasos, tope_horas } = CFG.fuera_de_linea
  const t = Math.min(Math.max(segundos, 0), tope_horas * 3600)
  const pasos = Math.min(Math.ceil(t / paso_s), max_pasos)
  const dt = t / pasos
  const antes = s.compresiones
  let energia = new Decimal(0)
  for (let i = 0; i < pasos && s.infinitos === 0; i++) {
    energia = energia.add(produccion(s).mul(dt))
    s = tick(s, dt)
  }
  return { s, segundos: t, energia, compresiones: s.compresiones - antes }
}
