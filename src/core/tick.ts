import Decimal from 'break_infinity.js'
import { CFG } from './config'
import { autoActivo, comprimir } from './compress'
import { INFINITO, caudal, enInfinito, energiaPorGrano, produccion } from './formulas'
import { comprarMax } from './shop'
import type { State } from './state'

/** SPEC 4.8: cada autocomprador encendido compra todo lo suyo que se pueda pagar. */
export function autocomprar(s: State): State {
  if (autoActivo(s, 'caudal')) s = comprarMax(s, 'caudal')
  CFG.colores.forEach((c, i) => {
    if (autoActivo(s, c.id)) s = comprarMax(s, `color${i}`)
  })
  return s
}

/** Avanza la economía dt segundos (Euler explícito, igual que balance/sim.py). */
export function tick(s: State, dt: number): State {
  if (enInfinito(s)) return s // economía congelada hasta el Infinito (core/infinito.ts)
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
