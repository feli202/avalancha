import Decimal from 'break_infinity.js'
import { CFG, MUTACIONES } from './config'
import { CFG1 } from './config1'
import { crecerEstratos } from './estratos'
import { crecerEscarcha, puedeRomperEscarcha, romperEscarcha } from './escarcha'
import { colorSinEfecto, enDefecto, metaAlcanzada } from './defectos'
import { ganarDefecto, infinito, infinitoAutoListo } from './infinito'
import { elegirSola } from './relicario'
import { ritmoAuto } from './fuego'
import { autoActivo, comprimir, puedeComprimir } from './compress'
import { GRANOS_MAX, INFINITO, caudal, congelada, enInfinito, energiaPorGrano, infinitoRoto, produccion } from './formulas'
import { comprar, comprarMax, comprarN, costo, puedeComprar, type ItemId } from './shop'
import type { State } from './state'

/** SPEC 4.8 y bloque 10: cada autocomprador encendido compra, cada `intervalo` segundos, su `cantidad` (×1, ×10 o el máximo). */
export function autocomprar(s: State): State {
  const { segundos, intervalo, cantidad } = s.automat
  const toca = (k: string) => autoActivo(s, k) && segundos % Math.max(1, Math.round(intervalo[k] / CFG.automatizacion.intervalo_s)) === 0
  const compra = (t: State, k: string, id: ItemId) =>
    cantidad[k] === 0 ? comprarMax(t, id) : cantidad[k] === 1 ? comprar(t, id) : comprarN(t, id, cantidad[k])
  if (toca('caudal')) s = compra(s, 'caudal', 'caudal')
  CFG.colores.forEach((c, i) => {
    if (toca(c.id) && !colorSinEfecto(s, i)) s = compra(s, c.id, `color${i}`) // Vacancia: Violeta a mano sí, solo no
  })
  // Memoria nv2 y nv3 (SPEC_CAPA1 §6.3): Cascada y Mutaciones automáticas, lo más barato primero y dejando un margen
  // de Energía (como sim_capa1.py), para no frenar a los colores.
  const n = (k: string) => cantidad[k] || Infinity
  if (toca('cascada')) s = comprarConMargen(s, ['cascada'], n('cascada'))
  if (toca('mutaciones')) s = comprarConMargen(s, MUTACIONES.map((m): ItemId => `mut_${m}`), n('mutaciones'))
  return s
}

const MARGEN = Decimal.pow10(CFG1.autocompradores_umbral_log10)
export function comprarConMargen(s: State, ids: ItemId[], max: number): State {
  for (let i = 0; i < max; i++) {
    const ok = ids.filter((id) => puedeComprar(s, id) && s.energia.gte(costo(s, id).mul(MARGEN)))
    if (!ok.length) return s
    s = comprar(s, ok.reduce((a, b) => (costo(s, b).lt(costo(s, a)) ? b : a)))
  }
  return s
}

/** Bloque 10: la Compresión automática, al llegar al umbral o `segundos` después. */
function comprimirSola(s: State, dt: number): State {
  if (!autoActivo(s, 'compresion_auto')) return s
  const { modo, segundos } = s.automat.compresion
  if (modo === 'umbral') return comprimir(s)
  const espera = puedeComprimir(s) ? s.automat.espera + dt : 0
  if (espera > 0 && espera >= segundos) return comprimir(s) // comprimir deja la espera en 0
  return espera === s.automat.espera ? s : { ...s, automat: { ...s.automat, espera } }
}

/** Avanza la economía dt segundos (Euler explícito, igual que balance/sim.py). `autoInfinito = false`: fuera de línea, sin
 * Infinito automático (la Energía espera en el umbral). */
export function tick(s: State, dt: number, autoInfinito = true): State {
  // Con Memoria nv4 y el interruptor, el Infinito se hace solo cuando lo diga su modo (bloque 10 y C6). Elige su reliquia
  // con la regla (SPEC_CAPA1 §5). Sin Romper, la economía queda congelada en 1e308 hasta el Infinito.
  // Dentro de un Defecto el Infinito automático no corre: solo termina en la meta (ganar, con la misma regla de reliquia).
  if (autoInfinito && !enDefecto(s) && enInfinito(s) && autoActivo(s, 'infinito') && infinitoAutoListo(s)) return elegirSola(infinito(s))
  if (metaAlcanzada(s)) return autoActivo(s, 'infinito') ? elegirSola(ganarDefecto(s)) : ganarDefecto(s)
  if (congelada(s)) return s
  const suma = s.energia.add(produccion(s).mul(dt))
  const energia = infinitoRoto(s) ? suma : Decimal.min(INFINITO, suma) // sin Romper, se frena en 1e308
  const granos = Math.min(GRANOS_MAX, caudal(s) * dt)
  let n: State = {
    ...s,
    energia,
    granos: Math.min(GRANOS_MAX, s.granos + granos),
    granosTotales: Math.min(GRANOS_MAX, s.granosTotales + granos),
    tiempoCorrida: s.tiempoCorrida + dt,
    tiempoTotal: s.tiempoTotal + dt,
    tiempoInfinito: s.tiempoInfinito + dt,
    maxEnergia: Decimal.max(s.maxEnergia, energia),
    estratos: crecerEstratos(s, dt, Math.log10(caudal(s))), // §7.2: por segundo de juego de Arena
    escarcha: crecerEscarcha(s, dt), // §9: también fuera de línea y dentro de los Defectos (menos Vidrio)
    relojAuto: s.relojAuto + dt,
    enfriamientoPunado: Math.max(0, s.enfriamientoPunado - dt),
  }
  while (
    n.coloresDesbloqueados < CFG.colores.length &&
    n.maxEnergia.log10() >= CFG.colores[n.coloresDesbloqueados].desbloqueo_log10
  )
    n.coloresDesbloqueados++
  if (autoActivo(n, 'escarcha') && puedeRomperEscarcha(n)) n = romperEscarcha(n) // Deshielo
  if (congelada(n)) return n
  const paso = CFG.automatizacion.intervalo_s / ritmoAuto(n) // Memoria eterna: el doble de seguido
  if (n.relojAuto >= paso) {
    n.relojAuto %= paso
    n = autocomprar({ ...n, automat: { ...n.automat, segundos: n.automat.segundos + 1 } })
  }
  return comprimirSola(n, dt)
}

/** SPEC 4.10: suelta un puñado de granos; cada uno rinde como un grano del Caudal. */
export function punado(s: State): State {
  if (congelada(s) || s.enfriamientoPunado > 0) return s
  const suma = s.energia.add(energiaPorGrano(s).mul(CFG.punado.granos))
  const energia = infinitoRoto(s) ? suma : Decimal.min(INFINITO, suma)
  return {
    ...s,
    energia,
    maxEnergia: Decimal.max(s.maxEnergia, energia),
    granos: s.granos + CFG.punado.granos,
    granosTotales: s.granosTotales + CFG.punado.granos,
    enfriamientoPunado: 1 / CFG.punado.max_por_segundo,
  }
}
