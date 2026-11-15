import Decimal from 'break_infinity.js'
import { CFG, MUTACIONES } from './config'
import { CFG1 } from './config1'
import { infinito } from './infinito'
import { memoria } from './red'
import { elegirSola } from './relicario'
import { autoActivo, comprimir } from './compress'
import { INFINITO, caudal, enInfinito, energiaPorGrano, produccion } from './formulas'
import { comprar, comprarMax, costo, puedeComprar, type ItemId } from './shop'
import type { State } from './state'

/** SPEC 4.8: cada autocomprador encendido compra todo lo suyo que se pueda pagar. */
export function autocomprar(s: State): State {
  if (autoActivo(s, 'caudal')) s = comprarMax(s, 'caudal')
  CFG.colores.forEach((c, i) => {
    if (autoActivo(s, c.id)) s = comprarMax(s, `color${i}`)
  })
  // Memoria nv2 y nv3 (SPEC_CAPA1 §6.3): Cascada y Mutaciones automáticas, lo más barato primero y dejando un margen
  // de Energía (como sim_capa1.py), para no frenar a los colores.
  if (memoria(s) >= 2) s = comprarConMargen(s, ['cascada'])
  if (memoria(s) >= 3) s = comprarConMargen(s, MUTACIONES.map((m): ItemId => `mut_${m}`))
  return s
}

const MARGEN = Decimal.pow10(CFG1.autocompradores_umbral_log10)
function comprarConMargen(s: State, ids: ItemId[]): State {
  for (;;) {
    const ok = ids.filter((id) => puedeComprar(s, id) && s.energia.gte(costo(s, id).mul(MARGEN)))
    if (!ok.length) return s
    s = comprar(s, ok.reduce((a, b) => (costo(s, b).lt(costo(s, a)) ? b : a)))
  }
}

/** Avanza la economía dt segundos (Euler explícito, igual que balance/sim.py). */
export function tick(s: State, dt: number): State {
  // Economía congelada hasta el Infinito (core/infinito.ts); con Memoria nv4 se hace solo, en el tick siguiente.
  // El Infinito automático elige su reliquia solo (SPEC_CAPA1 §5).
  if (enInfinito(s)) return memoria(s) >= 4 ? elegirSola(infinito(s)) : s
  const energia = Decimal.min(INFINITO, s.energia.add(produccion(s).mul(dt))) // sin Romper, se frena en 1e308
  const granos = caudal(s) * dt
  let n: State = {
    ...s,
    energia,
    granos: s.granos + granos,
    granosTotales: s.granosTotales + granos,
    tiempoCorrida: s.tiempoCorrida + dt,
    tiempoTotal: s.tiempoTotal + dt,
    maxEnergia: Decimal.max(s.maxEnergia, energia),
    relojAuto: s.relojAuto + dt,
    enfriamientoPunado: Math.max(0, s.enfriamientoPunado - dt),
  }
  while (
    n.coloresDesbloqueados < CFG.colores.length &&
    n.maxEnergia.log10() >= CFG.colores[n.coloresDesbloqueados].desbloqueo_log10
  )
    n.coloresDesbloqueados++
  if (enInfinito(n)) return n
  if (n.relojAuto >= 1) {
    n.relojAuto %= 1
    n = autocomprar(n)
  }
  return autoActivo(n, 'compresion_auto') ? comprimir(n) : n
}

/** SPEC 4.10: suelta un puñado de granos; cada uno rinde como un grano del Caudal. */
export function punado(s: State): State {
  if (enInfinito(s) || s.enfriamientoPunado > 0) return s
  const energia = Decimal.min(INFINITO, s.energia.add(energiaPorGrano(s).mul(CFG.punado.granos)))
  return {
    ...s,
    energia,
    maxEnergia: Decimal.max(s.maxEnergia, energia),
    granos: s.granos + CFG.punado.granos,
    granosTotales: s.granosTotales + CFG.punado.granos,
    enfriamientoPunado: 1 / CFG.punado.max_por_segundo,
  }
}
