// Capa 2, migración (docs/capa2/migracion.md): una partida que pasó el tope de Cristales vuelve a él. Se bajan las compras en
// Cristales (Red, abrir Estratos, Permeabilidad, Presión) de la más cara a la más barata hasta que lo gastado entre en el tope.
// Lo devuelto no se reembolsa. Las Esquirlas no se compran con Cristales ni cambian todavía: no se tocan.
import Decimal from 'break_infinity.js'
import { CFG1 } from './config1'
import { topeCristales } from './infinito'
import { NODOS, costoRed, cristalesDe } from './red'
import { ESTRATOS, costoMejoraLog10, type MejoraEstrato } from './estratos'
import { precioLog10 } from './config'
import type { State } from './state'

type Est = State['estratos']
/** Una línea de compras: su nivel, el costo del nivel n → n+1 y cómo queda con otro nivel. */
interface Linea { nombre: string; nivel: number; costo: (n: number) => Decimal; con: (s: State, n: number) => State }

const conEst = (s: State, e: Partial<Est>): State => ({ ...s, estratos: { ...s.estratos, ...e } })
const lineas = (s: State): Linea[] => [
  ...Object.keys(NODOS).map((id): Linea => ({
    nombre: `red.${id}`, nivel: s.red[id] ?? 0, costo: (n) => costoRed(id, n), con: (t, n) => ({ ...t, red: { ...t.red, [id]: n } }),
  })),
  { nombre: 'estratos.abiertos', nivel: s.estratos.abiertos, costo: (n) => cristalesDe(precioLog10(CFG1.estratos.abrir_log10[n] ?? Infinity)),
    con: (t, n) => conEst(t, { abiertos: n }) },
  ...(['perm', 'pres'] as MejoraEstrato[]).flatMap((que) => Array.from({ length: ESTRATOS }, (_, k): Linea => ({
    nombre: `estratos.${que}[${k}]`, nivel: s.estratos[que][k], costo: (n) => cristalesDe(costoMejoraLog10(que, k, n)),
    con: (t, n) => conEst(t, { [que]: t.estratos[que].map((v, i) => (i === k ? n : v)) }),
  }))),
]

/** Cristales gastados en todas las compras (los costos de cada línea suben con el nivel). */
export const gastado = (s: State) =>
  lineas(s).reduce((g, l) => { for (let n = 0; n < l.nivel; n++) g = g.add(l.costo(n)); return g }, new Decimal(0))

/** Pasó el tope: Cristales o Cristales totales por encima. */
export const pasoTope = (s: State) => s.cristales.gt(topeCristales(s)) || s.cristalesTotales.gt(topeCristales(s))

/** Lleva la partida al tope. Sin pasarlo, el mismo estado y nada devuelto. `devueltas`: "linea nivel→nivel", en el orden
 * en que se bajaron. */
export function toparCristales(s: State): { estado: State; devueltas: string[] } {
  if (!pasoTope(s)) return { estado: s, devueltas: [] }
  const tope = topeCristales(s)
  let t: State = { ...s, cristales: Decimal.min(tope, s.cristales), cristalesTotales: Decimal.min(tope, s.cristalesTotales) }
  const bajadas = new Map<string, [number, number]>()
  const bajar = (l: Linea, n: number) => { bajadas.set(l.nombre, [bajadas.get(l.nombre)?.[0] ?? l.nivel, n]); t = l.con(t, n) }
  // Un nivel que solo ya pasa el tope se va sí o sí; por bisección (un guardado roto puede traer nivel 1e9).
  for (const l of lineas(t)) {
    let lo = 0, hi = l.nivel // el primer nivel n cuyo costo (n → n+1) pasa el tope; los de abajo entran
    while (lo < hi) { const m = Math.floor((lo + hi) / 2); if (l.costo(m).gt(tope)) hi = m; else lo = m + 1 }
    if (lo < l.nivel) bajar(l, lo)
  }
  // Después, de a un nivel: el más caro de todos es siempre el último de alguna línea.
  while (gastado(t).gt(tope)) {
    const l = lineas(t).filter((x) => x.nivel > 0).reduce((a, b) => (b.costo(b.nivel - 1).gt(a.costo(a.nivel - 1)) ? b : a))
    bajar(l, l.nivel - 1)
  }
  return { estado: t, devueltas: [...bajadas].map(([k, [de, a]]) => `${k} ${de}→${a}`) }
}
