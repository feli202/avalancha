// SPEC_CAPA1 §5 y CORRECCIONES_CAPA1 bloque 8: el Relicario como inventario de piezas. Tipos y números de config_capa1.json.
// Cada Infinito el jugador elige el tipo; la pieza nueva es Ámbar (nivel 0). 3 del mismo tipo y nivel se fusionan en una
// del nivel siguiente. Solo las piezas en los Engarces dan efecto, y dos del mismo tipo se suman (igual que sim_capa1.py).
import { precioLog10 } from './config'
import { CFG1 } from './config1'
import { efectoRed } from './red'
import { enVidrio } from './defectos'
import { CFG2 } from './config2'
import { comprarFuego, extraSector, templadoX, tieneFuego } from './fuego'
import type { Pieza, Regla, State } from './state'

const R = CFG1.relicario
export const TIPOS: string[] = R.tipos
export const MODOS: Regla['modo'][] = ['completar', 'fijo', 'rotar', 'subir', 'prioridad']

/** Escalera: el color (0 Ámbar … 3 Violeta) y cuántas vueltas lleva (el "+1"). */
export const escalon = (nivel: number) => ({ color: nivel % 4, vuelta: Math.floor(nivel / 4) })
/** Capa 2 (beta), Relicario de fuego (Engarces de fuego): inventario doble y todo automático (docs/capa2/escarcha_reliquias.md). */
export const relicarioFuego = (s: State) => tieneFuego(s, 'engarces')
/** Engaste de lava (Engarces II de fuego): un espacio más y las engarzadas cuentan un nivel más. */
const lava = (s: State) => tieneFuego(s, 'engarces2')
export const espacios = (s: State) =>
  Math.max(1, efectoRed(s, 'engarces', 'espacios', 1), efectoRed(s, 'engarces2', 'espacios', 1)) + (lava(s) ? CFG2.red_fuego.engarces2.espacios : 0)
/** Engarces II: la fusión puede ser automática (con el Relicario de fuego, siempre). */
export const fusionAutomatica = (s: State) => (s.red.engarces2 ?? 0) >= 1 || relicarioFuego(s)
/** Casilleros del inventario: tamaño fijo de config, × 2 con el Relicario de fuego. */
export const casilleros = (s: State) => R.casilleros * (relicarioFuego(s) ? CFG2.red_fuego.engarces.casilleros_x : 1)
/** Sin casillero libre la reliquia nueva va a la espera (hasta fusionar o hacer lugar). */
export const inventarioLleno = (s: State) => s.relicario.piezas.length >= casilleros(s)
/** Engarces nv4: reliquias que deja cada Infinito. */
export const reliquiasPorInfinito = (s: State) => efectoRed(s, 'engarces', 'reliquias_por_infinito', 1)

const pieza = (s: State, id: number) => s.relicario.piezas.find((p) => p.id === id)
const nuevoId = (s: State) => Math.max(0, ...s.relicario.piezas.map((p) => p.id), ...s.relicario.espera.map((p) => p.id)) + 1
const conRel = (s: State, rel: Partial<State['relicario']>): State => ({ ...s, relicario: { ...s.relicario, ...rel } })
/** Las que esperaban entran al inventario mientras haya lugar (las más viejas primero). */
function acomodar(s: State): State {
  const { piezas, espera } = s.relicario
  const n = Math.max(0, Math.min(espera.length, casilleros(s) - piezas.length))
  return n ? conRel(s, { piezas: [...piezas, ...espera.slice(0, n)], espera: espera.slice(n) }) : s
}
/** Las piezas que dan efecto (las de los espacios que existen). */
export const equipadas = (s: State) => s.relicario.equipadas.slice(0, espacios(s)).map((id) => pieza(s, id)).filter((p): p is Pieza => !!p)
/** Mejor nivel del tipo en el inventario (o solo entre las equipadas); −1 sin ninguna. */
export const mejorNivel = (s: State, t: string, soloEquipadas = false) =>
  Math.max(-1, ...(soloEquipadas ? equipadas(s) : s.relicario.piezas).filter((p) => p.tipo === t).map((p) => p.nivel))

// ---------- fusión ----------

/** Grupos de 3 que se pueden fusionar: las tres más viejas de cada (tipo, nivel) con 3 o más. */
export function fusionables(s: State): number[][] {
  const g = new Map<string, Pieza[]>()
  for (const p of s.relicario.piezas) g.set(`${p.tipo}:${p.nivel}`, [...(g.get(`${p.tipo}:${p.nivel}`) ?? []), p])
  return [...g.values()].filter((ps) => ps.length >= 3).map((ps) => ps.sort((a, b) => a.inf - b.inf || a.id - b.id).slice(0, 3).map((p) => p.id))
}

/** Fusiona tres piezas del mismo tipo y nivel en una del nivel siguiente, con la pila de la más vieja.
 * Si alguna estaba engarzada, la nueva queda en el primer espacio de ellas. Si no se puede, devuelve el mismo estado. */
export function fusionar(s: State, ids: number[]): State {
  const ps = [...new Set(ids)].map((id) => pieza(s, id)).filter((p): p is Pieza => !!p)
  if (ps.length !== 3 || ps.some((p) => p.tipo !== ps[0].tipo || p.nivel !== ps[0].nivel)) return s
  const vieja = ps.reduce((a, b) => (b.inf < a.inf || (b.inf === a.inf && b.id < a.id) ? b : a))
  const nueva: Pieza = { id: nuevoId(s), tipo: vieja.tipo, nivel: vieja.nivel + 1, foto: vieja.foto, inf: vieja.inf }
  const fuera = new Set(ps.map((p) => p.id))
  const e = s.relicario.equipadas, k = e.findIndex((id) => fuera.has(id))
  return acomodar(conRel(s, {
    piezas: [...s.relicario.piezas.filter((p) => !fuera.has(p.id)), nueva],
    equipadas: e.map((id, i) => (i === k ? nueva.id : id)).filter((id) => !fuera.has(id)),
  }))
}

/** Fusiona mientras haya tres iguales (de abajo hacia arriba: tres Ámbar dan una Coral, que puede completar otras tres). */
export function fusionarTodo(s: State): State {
  for (let g = fusionables(s); g.length; g = fusionables(s)) s = fusionar(s, g.sort((a, b) => pieza(s, a[0])!.nivel - pieza(s, b[0])!.nivel)[0])
  return s
}

// ---------- Pulido (SPEC_CAPA1 §5, 1.2): Esquirlas por un color, sin fusionar ----------

/** log10 del costo de pulir una pieza de nivel n: `c0 + paso × n × pulido_x` (Engarces II lo abarata), entero como todo precio. */
export const costoPulidoLog10 = (s: State, nivel: number) =>
  precioLog10(CFG1.escarcha.pulido.c0 + CFG1.escarcha.pulido.paso * nivel * efectoRed(s, 'engarces2', 'pulido_x', 1))
export const costoPulido = (s: State, nivel: number) => 10 ** costoPulidoLog10(s, nivel)
export const puedePulir = (s: State, id: number) => {
  const p = pieza(s, id)
  return !!p && s.escarcha.abierta && s.escarcha.esquirlas >= costoPulido(s, p.nivel)
}
/** Sube la pieza un nivel (conserva su lugar y su pila). Si completa tres iguales y la fusión es automática, fusiona. */
export function pulir(s: State, id: number): State {
  if (!puedePulir(s, id)) return s
  const p = pieza(s, id)!
  let n = conRel(s, { piezas: s.relicario.piezas.map((x) => (x.id === id ? { ...x, nivel: x.nivel + 1 } : x)) })
  n = { ...n, escarcha: { ...n.escarcha, esquirlas: n.escarcha.esquirlas - costoPulido(s, p.nivel) } }
  if (relicarioFuego(n)) return ordenarDeFuego(n)
  return s.relicario.regla.fusionar && fusionAutomatica(n) ? fusionarTodo(n) : n
}

// ---------- engarces ----------

/** Pone la pieza en el espacio i (gratis). Si ya estaba engarzada, cambia de lugar con la del espacio. */
export function equipar(s: State, id: number, i: number): State {
  if (!pieza(s, id) || i < 0 || i >= espacios(s)) return s
  const e = s.relicario.equipadas.slice(0, espacios(s)), j = e.indexOf(id)
  const k = Math.min(i, j < 0 ? e.length : e.length - 1)
  if (j >= 0) e[j] = e[k]
  e[k] = id
  return conRel(s, { equipadas: e })
}
export const desequipar = (s: State, id: number): State =>
  s.relicario.equipadas.includes(id) ? conRel(s, { equipadas: s.relicario.equipadas.filter((x) => x !== id) }) : s

/** Engarza las mejores: mayor nivel primero; en empate, la que ya estaba puesta y después el orden de los tipos. */
export function equiparMejores(s: State): State {
  const puesta = new Set(s.relicario.equipadas)
  const orden = [...s.relicario.piezas].sort((a, b) => b.nivel - a.nivel || +puesta.has(b.id) - +puesta.has(a.id) || TIPOS.indexOf(a.tipo) - TIPOS.indexOf(b.tipo) || a.id - b.id)
  return conRel(s, { equipadas: orden.slice(0, espacios(s)).map((p) => p.id) })
}

// ---------- elegir el tipo ----------

/** Ámbar del tipo que hay en el inventario (las que esperan su fusión). */
const ambar = (s: State, t: string) => s.relicario.piezas.filter((p) => p.tipo === t && p.nivel === 0).length

/** El tipo que elige la regla automática (bloque 8). En empate gana el primero del orden de la regla. */
export function tipoAutomatico(s: State): string {
  const { regla, ultimo } = s.relicario
  const orden = [...regla.orden.filter((t) => TIPOS.includes(t)), ...TIPOS.filter((t) => !regla.orden.includes(t))]
  const menor = (f: (t: string) => number) => orden.reduce((a, b) => (f(b) < f(a) ? b : a))
  switch (regla.modo) {
    case 'fijo': return orden[0]
    case 'rotar': return TIPOS[(TIPOS.indexOf(ultimo) + 1) % TIPOS.length]
    // Al que le falte menos para la próxima fusión (3 Ámbar); en empate, el que tiene alguna engarzada.
    case 'completar': return menor((t) => (3 - (ambar(s, t) % 3)) * 2 - (mejorNivel(s, t, true) >= 0 ? 1 : 0))
    case 'subir': return menor((t) => mejorNivel(s, t, true))
    // Prioridad: el primero va un nivel arriba del segundo y dos arriba del tercero.
    case 'prioridad': return menor((t) => mejorNivel(s, t) + orden.indexOf(t))
  }
}

/** Agrega una reliquia del Infinito pendiente, del tipo t (con la pila de ese Infinito); con Engarces nv4 son dos y el
 * Infinito sigue pendiente hasta elegir la segunda. Después, lo que diga la regla: fusionar solas (con Engarces II) y
 * engarzar las mejores. Sin lugar en el inventario (ni con la fusión automática) va a la espera: nunca se pierde.
 * Sin Infinito pendiente o con un tipo que no existe, el mismo estado. */
export function elegir(s: State, t: string): State {
  const rel = s.relicario
  if (!rel.pendiente || !TIPOS.includes(t)) return s
  const p: Pieza = { id: nuevoId(s), tipo: t, nivel: 0, foto: rel.foto, inf: rel.pendiente }
  const faltan = Math.max(1, rel.faltan) - 1
  const sigue = faltan ? { faltan } : { pendiente: 0, faltan: 0, foto: '' }
  let n = conRel(s, { piezas: [...rel.piezas, p], ultimo: t, ...sigue })
  if (rel.regla.fusionar && fusionAutomatica(n)) n = fusionarTodo(n)
  if (n.relicario.piezas.length > Math.max(casilleros(s), rel.piezas.length)) {
    const fuera = n.relicario.piezas.find((x) => x.id === p.id)
    n = fuera ? conRel(n, { piezas: n.relicario.piezas.filter((x) => x !== fuera), espera: [...rel.espera, fuera] }) : n
  }
  return rel.regla.equipar ? equiparMejores(n) : n
}
/** Sin elegir a tiempo, o con Infinito automático: la regla, para cada reliquia que falte. */
export function elegirSola(s: State): State {
  for (let k = 0; s.relicario.pendiente && k < 4; k++) s = elegir(s, tipoAutomatico(s))
  return s
}

/** La interfaz pone la instantánea de la pila (el núcleo no ve la pila): en el Infinito pendiente y en las piezas
 * del último Infinito que no la tengan (el Infinito automático elige en el mismo tick). */
export function conFoto(s: State, foto: string): State {
  const rel = s.relicario
  const falta = (p: Pieza) => !p.foto && p.inf === s.infinitos
  if (!foto || ((!rel.pendiente || rel.foto) && !rel.piezas.some(falta))) return s
  return conRel(s, { foto: rel.pendiente && !rel.foto ? foto : rel.foto, piezas: rel.piezas.map((p) => (falta(p) ? { ...p, foto } : p)) })
}

// ---------- Relicario de fuego ----------

/** Todo automático: la reliquia que esperaba su tipo se elige con la regla, las que esperaban lugar vuelven, se fusiona todo
 * (también con las de la espera, para que nunca se trabe) y se engarzan las mejores. Sin lugar, esperan las de menor nivel que
 * no están engarzadas. Es también la migración al encenderlo: una pieza engarzada solo sale por otra de nivel mayor
 * (equiparMejores) y nada se pierde, así que nadie pierde poder. */
export function ordenarDeFuego(s: State): State {
  s = elegirSola(s)
  s = equiparMejores(fusionarTodo(conRel(s, { piezas: [...s.relicario.piezas, ...s.relicario.espera], espera: [] })))
  const sobra = s.relicario.piezas.length - casilleros(s)
  if (sobra <= 0) return s
  const puesta = new Set(s.relicario.equipadas)
  const fuera = s.relicario.piezas.filter((p) => !puesta.has(p.id)).sort((a, b) => a.nivel - b.nivel || b.id - a.id).slice(0, sobra)
  return conRel(s, { piezas: s.relicario.piezas.filter((p) => !fuera.includes(p)), espera: fuera })
}
/** Cada Infinito con el Relicario de fuego: una reliquia de cada tipo (sin elegir), y a ordenar. */
export function reliquiasDeFuego(s: State, inf: number): State {
  const id = nuevoId(s)
  return ordenarDeFuego(conRel(s, { espera: [...s.relicario.espera, ...TIPOS.map((tipo, k) => ({ id: id + k, tipo, nivel: 0, foto: '', inf }))] }))
}
/** Encender un nivel de fuego desde la interfaz: con el Relicario de fuego (o su Engaste) el Relicario se ordena en el acto. */
export function encenderFuego(s: State, id: string): State {
  const n = comprarFuego(s, id)
  return n !== s && relicarioFuego(n) && (id === 'engarces' || id === 'engarces2') ? ordenarDeFuego(n) : n
}

// ---------- efectos (solo las equipadas; dos del mismo tipo se suman; tabla de §5, igual que mods() de sim_capa1.py) ----------
const POR_NIVEL: Record<string, number> = {
  cauce: R.cauce_colores_pct_por_nivel, cascada: R.cascada_c_por_nivel, mutaciones: R.mutaciones_efecto_por_nivel,
}
/** El efecto de una pieza del tipo y nivel dados. */
export const efectoNivel = (t: string, nivel: number) => (nivel < 0 ? 0 : POR_NIVEL[t] * (nivel + 1))
/** El efecto de las engarzadas de un tipo: × Templado del Horno × sector Relicario del Motor; con Engaste de lava, un nivel más. */
export const efectoTipo = (s: State, t: string) => {
  if (enVidrio(s)) return 0
  const mas = lava(s) ? CFG2.red_fuego.engarces2.niveles : 0
  return templadoX(s) * extraSector(s, 'relicario') * equipadas(s).reduce((a, p) => a + (p.tipo === t ? efectoNivel(t, p.nivel + mas) : 0), 0)
}
const efecto = efectoTipo
/** Cauce: los colores valen (log10) × (1 + esto). */
export const cauceRel = (s: State) => efecto(s, 'cauce')
/** Cascada: se suma al exponente c. */
export const cascadaRel = (s: State) => efecto(s, 'cascada')
/** Mutaciones: las de Caudal y Colores rinden × (1 + esto). */
export const mutacionesRel = (s: State) => efecto(s, 'mutaciones')

// ---------- migración ----------

/** Relicario de antes del bloque 8 (cantidad por tipo + tipos engarzados) → piezas. Cada cantidad se fusiona entera
 * (los dígitos en base 3, como `pieces()` del simulador) y cada tipo que estaba engarzado engarza su mejor pieza:
 * el efecto viejo era el del nivel floor(log3(n)), que es justo esa pieza. Nadie pierde poder. */
export function migrarRelicario(reliquias: Record<string, number>, tipos: string[]): Pick<State['relicario'], 'piezas' | 'equipadas'> {
  const piezas: Pieza[] = []
  for (const t of TIPOS)
    for (let c = Math.max(0, Math.floor(reliquias[t] ?? 0)), n = 0; c > 0; c = Math.floor(c / 3), n++)
      for (let k = 0; k < c % 3; k++) piezas.push({ id: piezas.length + 1, tipo: t, nivel: n, foto: '', inf: 0 })
  const mejor = (t: string) => piezas.filter((p) => p.tipo === t).reduce<Pieza | undefined>((a, p) => (!a || p.nivel > a.nivel ? p : a), undefined)
  return { piezas, equipadas: tipos.map(mejor).filter((p): p is Pieza => !!p).map((p) => p.id) }
}
