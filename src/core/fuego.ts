// Capa 2 (beta), fase 3: la Fundición, las Brasas, la Temperatura y el quinto nivel (de fuego) de los nodos de la Red.
// docs/capa2/fundicion.md, temperatura_motor.md y red_fuego.md; las fórmulas son las de sim_capa2.py (brasas_al_fundir, Fuego.T).
// La marca de beta vive en la partida, no acá: sin beta `fuego` queda en cero (guardado.ts) y nada de esto cambia el juego.
import Decimal from 'break_infinity.js'
import { CFG, precioLog10 } from './config'
import { CFG1 } from './config1'
import { CFG2 } from './config2'
import { DEFECTOS, cargasCompletas } from './defectos'
import { NIVEL_MAX_RED, compresionesConservadas, efectoRed, nivelRed } from './red'
import { lleno } from './estratos'
import { estadoInicial, type CompraEsquirla, type MejoraHorno, type State } from './state'

const FU = CFG2.fundicion
const HO = CFG2.horno
const TP = CFG2.temperatura
const ESQ = CFG2.esquirlas_fuego
const RF = CFG2.red_fuego
/** Los 25 nodos con nivel de fuego, en el orden de config (desde la fase 9 funcionan todos). */
export const NODOS_FUEGO = Object.keys(RF)

export const tieneFuego = (s: State, id: string) => s.fuego.nodos.includes(id)
export const precioFuego = (id: string) => CFG2.red_fuego[id].precio

/** Temperatura en K: 300 + 795 × Brasas totales^0,165 × Esquirla de fuego + Compresión térmica + Calor latente (Fuego.T de sim_capa2.py). */
export const temperatura = (s: State) =>
  TP.inicial + TP.por_brasa * s.fuego.brasasTotales ** TP.exp_brasas * ESQ.esquirla_fuego.x ** s.fuego.compras.esquirla_fuego +
  RF.compactacion2.K_por_compresion * s.fuego.compresiones + HO.mejoras.calor_latente.K * s.fuego.horno.calor_latente
/** Ignición (escalado_ignicion.md): 5.778 K, el fin de la Capa 2. La Temperatura nunca baja, así que una vez llegada queda. */
export const ignicion = (s: State) => temperatura(s) >= TP.ignicion
/** El calor en miles de K: (T − 300) / 1000 (lo que reparte el Motor y lo que leen Magma y los demás "por kK"). */
export const milesK = (s: State) => (temperatura(s) - TP.inicial) / 1000
/** Lo que la Temperatura suma a la Densidad: (T − 300) × 0,001; Densidad ígnea (Compactación de fuego) ×1,5. */
export const densidadFuego = (s: State) =>
  (temperatura(s) - TP.inicial) * TP.densidad_por_K * (tieneFuego(s, 'compactacion') ? CFG2.red_fuego.compactacion.densidad_x : 1)

/** Requisito: 1e308 Cristales totales en esta vuelta (el tope de los Cristales). */
export const puedeFundir = (s: State) => s.cristalesTotales.log10() >= FU.requisito_log10

/** M_B = (1 + Crisol) × 1,002^cargas × (1 + 0,05 × cargas con Facetas de fuego), con las cargas 2–5 completas. */
export function multBrasas(s: State) {
  const c = cargasCompletas(s)
  const m = (FU.M_B + HO.mejoras.crisol.suma * s.fuego.horno.crisol) * CFG2.defectos.MB_x_por_carga ** c
  return tieneFuego(s, 'cristalografia2') ? m * (1 + CFG2.red_fuego.cristalografia2.MB_por_carga * c) : m
}
/** Brasas = ⌊M_B × (log10 C / 308)^q⌋, q = 5,2 (×1,387 con Fusión, Ruptura II de fuego). Con los Cristales frenados en el tope
 * da M_B; con Fusión del Infinito los Cristales pasan de 1e308 y las Brasas escalan. */
export function brasasAlFundir(s: State) {
  const mb = multBrasas(s), q = FU.brasas_exp * (tieneFuego(s, 'ruptura2') ? RF.ruptura2.brasas_exp_x : 1)
  const x = Math.min(300, Math.log10(mb) + q * Math.log10(Math.max(1, s.cristalesTotales.log10() / FU.brasas_desde_log10)))
  return Math.floor(10 ** x + 1e-9)
}

/** Funde las Capas 0 y 1: se conservan la Automatización (interruptores, su configuración y la regla de las reliquias), las
 * estadísticas y todo el fuego. Memoria eterna: la vuelta arranca con Memoria nv4 y sus compresiones. Escarcha eterna: la
 * Escarcha (espesor, Esquirlas y mejoras) sigue entera. */
export function fundir(s: State): State {
  if (!puedeFundir(s)) return s
  const b = brasasAlFundir(s)
  const i = estadoInicial()
  const t: State = {
    ...i, granos: 0, // granos_iniciales es solo para la primera partida
    auto: s.auto, automat: { ...s.automat, espera: 0 }, relicario: { ...i.relicario, regla: s.relicario.regla },
    ...(tieneFuego(s, 'frio') && { escarcha: s.escarcha }),
    tiempoTotal: s.tiempoTotal, granosTotales: s.granosTotales, mejorCorrida: s.mejorCorrida, compresionesSinAmbar: s.compresionesSinAmbar,
    defectos: { ...i.defectos, completos: DEFECTOS.filter((_, k) => s.fuego.cargas[k] > 1) }, // con una carga 2–5 hecha, completo desde el inicio
    fuego: { ...s.fuego, brasas: s.fuego.brasas + b, brasasTotales: s.fuego.brasasTotales + b, fundiciones: s.fuego.fundiciones + 1, vuelta: 0 },
  }
  if (!tieneFuego(t, 'memoria')) return t
  const m = { ...t, red: { ...t.red, memoria: NIVEL_MAX_RED } }
  return { ...m, compresiones: Math.min(compresionesConservadas(m), CFG.compresion.umbrales_log10.length) }
}

/** El nivel de fuego se compra con Brasas, con el nodo en nv4 en esta vuelta; es permanente. */
export const puedeComprarFuego = (s: State, id: string) =>
  id in RF && !tieneFuego(s, id) && nivelRed(s, id) >= NIVEL_MAX_RED && s.fuego.brasas >= precioFuego(id)

export const comprarFuego = (s: State, id: string): State =>
  puedeComprarFuego(s, id) ? { ...s, fuego: { ...s.fuego, brasas: s.fuego.brasas - precioFuego(id), nodos: [...s.fuego.nodos, id] } } : s

/** Lecho infinito (Sedimentación de fuego): compresiones sin el tope de 17. */
export const lechoInfinito = (s: State) => tieneFuego(s, 'sedimentacion')
/** Desborde (Cascada+ de fuego) y Metamorfosis (Mutación+ de fuego): Cascada y Mutaciones sin nivel máximo. */
export const desborde = (s: State) => tieneFuego(s, 'cascada_plus')
export const metamorfosis = (s: State) => tieneFuego(s, 'mutacion_plus')
/** Inercia eterna: el impulso de los estratos × (1 + √(horas de la vuelta)). */
export const inerciaEterna = (s: State) =>
  tieneFuego(s, 'inercia') ? 1 + CFG2.red_fuego.inercia.impulso_por_raiz_h * Math.sqrt(s.fuego.vuelta / 3600) : 1
/** Magma (Presión de fuego): el peso de los Estratos × (1 + 0,2 × (T − 300) / 1000). */
export const magma = (s: State) => (tieneFuego(s, 'presion') ? 1 + CFG2.red_fuego.presion.w_por_kK * milesK(s) : 1)

// --- El softcap fuerte de las liberaciones (liberaciones.md; efectivo y extra de sim_capa2.py) ---
const LIB = CFG2.liberaciones
/** Nivel que cuenta para el efecto: pasado el tope, cada nivel rinde × 0,5 en log10 (la raíz cuadrada del multiplicador). */
export const nivelLiberado = (n: number, tope: number) => (n <= tope ? n : tope + (n - tope) * LIB.rinde)
/** Órdenes que se suman al costo del nivel n → n+1: j(j+1)/2 con j = niveles pasados el tope contando este (×10, ×1.000, …). */
export function extraLiberado(n: number, tope: number) {
  const j = n - tope + 1
  return j > 0 ? (LIB.paso_extra * j * (j + 1)) / 2 : 0
}

/** Memoria eterna: los autocompradores, el doble de rápido. */
export const ritmoAuto = (s: State) => (tieneFuego(s, 'memoria') ? CFG2.red_fuego.memoria.autocompradores_x : 1)

// --- Motor de Brasas y reparto del calor (fase 4, temperatura_motor.md) ---

/** Los sectores del Motor, en el orden de las partes de cada reparto. */
export const SECTORES = ['pila', 'red', 'estratos', 'escarcha', 'relicario'] as const
export type Sector = (typeof SECTORES)[number]
/** El nodo de fuego que abre cada sector (Pila y Red abren con la primera Fundición). */
const ABRE: Record<Sector, string> = { pila: '', red: '', estratos: 'estratos', escarcha: 'frio', relicario: 'engarces' }

export const sectorAbierto = (s: State, k: Sector) => s.fuego.fundiciones > 0 && (!ABRE[k] || tieneFuego(s, ABRE[k]))
export const abiertos = (s: State) => SECTORES.map((k) => sectorAbierto(s, k))
/** Etapa del iris: 0 cerrado; 1 Pila y Red; 2 el Horno (Estratos); 3 Escarcha eterna; 4 Relicario de fuego, abierto del todo. */
export const etapaMotor = (s: State) => abiertos(s).filter(Boolean).length - (s.fuego.fundiciones > 0 ? 1 : 0)

/** Las partes del reparto entre los sectores abiertos, sumando 1 (los cerrados no cuentan; sin nada, todo a Pila). */
export function partes(rep: number[], ab: boolean[]): number[] {
  const p = SECTORES.map((_, i) => (ab[i] ? Math.max(0, rep[i] ?? 0) : 0))
  const t = p.reduce((a, b) => a + b, 0)
  return t > 0 ? p.map((x) => x / t) : SECTORES.map((_, i) => (i === 0 ? 1 : 0))
}
export const repartoActivo = (s: State) => partes(s.fuego.repartos[s.fuego.reparto], abiertos(s))

/** Calor de un sector: h = parte × (T − 300) / 1000. */
export const calor = (s: State, k: Sector) => repartoActivo(s)[SECTORES.indexOf(k)] * milesK(s)
/** Extra del sector: 1 + efecto × h (Pila: multiplica colores y cauce en log10 V). */
export const extraSector = (s: State, k: Sector) => 1 + CFG2.motor.efecto[k] * calor(s, k)
/** Sector Red: Cristales por Infinito ×10^h (en log10). */
export const redLog10Motor = (s: State) => CFG2.motor.efecto.red * calor(s, 'red')

/** Pone la parte de un sector en `v` (0–1) y reparte el resto entre los otros abiertos, en proporción (o igual, si no tenían). */
export function ponerParte(rep: number[], i: number, v: number, ab: boolean[]): number[] {
  const p = partes(rep, ab)
  const x = Math.min(1, Math.max(0, v))
  const otros = SECTORES.map((_, j) => j !== i && ab[j])
  const n = otros.filter(Boolean).length
  if (!n) return p
  const resto = p.reduce((a, b, j) => a + (otros[j] ? b : 0), 0)
  return p.map((b, j) => (j === i ? x : otros[j] ? (resto > 0 ? (b / resto) * (1 - x) : (1 - x) / n) : 0))
}

/** Arrastrar el borde entre dos sectores: pasa `d` de la parte de `j` a la de `i` (sin dejar ninguna fuera de 0–1). */
export function moverBorde(rep: number[], i: number, j: number, d: number, ab: boolean[]): number[] {
  const p = partes(rep, ab)
  const x = Math.min(p[j], Math.max(-p[i], d))
  return p.map((b, k) => (k === i ? b + x : k === j ? b - x : b))
}

/** Guarda el reparto en el lugar que se está usando. */
export const ponerReparto = (s: State, rep: number[]): State =>
  ({ ...s, fuego: { ...s.fuego, repartos: s.fuego.repartos.map((r, k) => (k === s.fuego.reparto ? rep : r)) } })
/** Cambia a otro de los 3 repartos guardados. */
export const elegirReparto = (s: State, k: number): State =>
  k >= 0 && k < s.fuego.repartos.length ? { ...s, fuego: { ...s.fuego, reparto: k } } : s

// --- El Horno y el Vidrio (fase 5, horno.md; igual que vidrio_log y costo_horno de sim_capa2.py) ---

export const MEJORAS_HORNO = Object.keys(HO.mejoras) as MejoraHorno[]
/** El Horno funde con El Horno encendido y los 8 estratos abiertos (el estrato 9 es el fondo del embudo). */
export const hornoEncendido = (s: State) => tieneFuego(s, 'estratos') && s.estratos.abiertos >= CFG1.estratos.cantidad
/** log10 del Vidrio/s = log10 v0 + 0,01 × s_8 (×1,5 con Sedimento fundido) + Temperatura del Horno × log10 2
 * + log10(1 + 0,5 × calor de Estratos) + Abismo ardiente (×2 por estrato lleno) + Eco del Horno (0,001 × p × log10 C).
 * −∞ con el Horno apagado. */
export const vidrioLog10 = (s: State) => !hornoEncendido(s) ? -Infinity
  : Math.log10(HO.v0) + HO.exp_s8 * Math.max(0, s.estratos.s[CFG1.estratos.cantidad - 1]) * (tieneFuego(s, 'sedimento2') ? RF.sedimento2.exp_s8_x : 1) +
    s.fuego.horno.temperatura * Math.log10(HO.mejoras.temperatura.x) + Math.log10(1 + CFG2.motor.efecto.estratos_vidrio * calor(s, 'estratos')) +
    (tieneFuego(s, 'abismo') ? s.estratos.s.filter((_, k) => k < s.estratos.abiertos && lleno(s, k)).length * Math.log10(RF.abismo.lleno_x) : 0) +
    (tieneFuego(s, 'eco2') ? RF.eco2.vidrio_log_por_eco * efectoRed(s, 'eco', 'p') * Math.max(0, s.cristalesTotales.log10()) : 0)
export const vidrioPorSegundo = (s: State) => (hornoEncendido(s) ? Decimal.pow10(vidrioLog10(s)) : new Decimal(0))
/** El Vidrio sube todo el tiempo (también fuera de línea, con el dt que le dé offline). */
export const fundirVidrio = (s: State, dt: number): State['fuego'] =>
  hornoEncendido(s) ? { ...s.fuego, vidrio: s.fuego.vidrio.add(vidrioPorSegundo(s).mul(dt)) } : s.fuego
/** Cristal fundido: cada Infinito suma 10 s de Vidrio. */
export const vidrioAlInfinito = (s: State): State['fuego'] =>
  tieneFuego(s, 'cristalografia') ? fundirVidrio(s, CFG2.red_fuego.cristalografia.vidrio_s_por_infinito) : s.fuego

/** log10 del costo del nivel L → L+1: c0 + paso × L + cub × L³ / 6, al exponente entero. */
export const costoHornoLog10 = (k: MejoraHorno, L: number) => {
  const q = HO.mejoras[k]
  return precioLog10(q.c0 + q.paso * L + (q.cub * L ** 3) / 6)
}
export const costoHorno = (s: State, k: MejoraHorno) => Decimal.pow10(costoHornoLog10(k, s.fuego.horno[k]))
export const puedeMejorarHorno = (s: State, k: MejoraHorno) => tieneFuego(s, 'estratos') && s.fuego.vidrio.gte(costoHorno(s, k))
export const mejorarHorno = (s: State, k: MejoraHorno): State =>
  puedeMejorarHorno(s, k)
    ? { ...s, fuego: { ...s.fuego, vidrio: s.fuego.vidrio.sub(costoHorno(s, k)), horno: { ...s.fuego.horno, [k]: s.fuego.horno[k] + 1 } } }
    : s
/** Lo que multiplica el flujo de los 8 estratos: Tiro (1 + 0,1 × nivel), el sector Estratos del Motor (1 + 0,5 h) y
 * Convección (Capilaridad de fuego: 1 + 0,5 × (T − 300) / 1000). */
export const flujoFuego = (s: State) => (1 + HO.mejoras.tiro.suma * s.fuego.horno.tiro) * extraSector(s, 'estratos') *
  (tieneFuego(s, 'capilaridad') ? 1 + RF.capilaridad.flujo_por_kK * milesK(s) : 1)
/** Templado: el efecto de las reliquias engarzadas × (1 + 0,1 × nivel). */
export const templadoX = (s: State) => 1 + HO.mejoras.templado.suma * s.fuego.horno.templado

// --- Fase 9: Fusión del Infinito, compras con Esquirlas y la Fundición automática (escalado_ignicion.md) ---

/** Fusión del Infinito (Ruptura de fuego): los Cristales pasan de 1e308. */
export const fusionInfinito = (s: State) => tieneFuego(s, 'ruptura')
/** El freno de los Cristales de un Infinito pasado el tope: tope + (lc − tope)^0,757 (soft_cristales de sim_capa2.py). */
export const frenoCristales = (lc: number) =>
  lc > CFG.infinito_log10 + 1 ? CFG.infinito_log10 + (lc - CFG.infinito_log10) ** FU.cristales_soft_exp : lc

export const COMPRAS_ESQUIRLAS = Object.keys(ESQ).filter((k) => !k.startsWith('_')) as CompraEsquirla[]
/** Esquirla de fuego y Geoda: aparecen con la primera Fundición; el nivel L cuesta 10^(1 + L) Esquirlas, sin tope. */
export const hayComprasEsquirlas = (s: State) => s.fuego.fundiciones > 0
export const costoEsquirlaLog10 = (k: CompraEsquirla, L: number) => precioLog10(ESQ[k].c0 + ESQ[k].paso * L)
export const costoEsquirla = (s: State, k: CompraEsquirla) => 10 ** costoEsquirlaLog10(k, s.fuego.compras[k])
export const puedeComprarEsquirla = (s: State, k: CompraEsquirla) => hayComprasEsquirlas(s) && s.escarcha.esquirlas >= costoEsquirla(s, k)
export const comprarEsquirla = (s: State, k: CompraEsquirla): State =>
  puedeComprarEsquirla(s, k)
    ? { ...s, escarcha: { ...s.escarcha, esquirlas: s.escarcha.esquirlas - costoEsquirla(s, k) }, fuego: { ...s.fuego, compras: { ...s.fuego.compras, [k]: s.fuego.compras[k] + 1 } } }
    : s
/** Geoda: Esquirlas/s ×2 por nivel. */
export const geodaX = (s: State) => ESQ.geoda.x ** s.fuego.compras.geoda

/** Fundición automática: apenas llega o, con Fusión del Infinito, cuando las Brasas totales quedarían ×x (sin Fusión cada
 * Fundición da M_B, así que "multiplicar" no tiene sentido y funde apenas llega, como el Infinito automático sin Romper). */
export function fundicionAutoLista(s: State) {
  if (!puedeFundir(s)) return false
  const { modo, x } = s.automat.fundicion
  return modo === 'llegar' || !fusionInfinito(s) || s.fuego.brasasTotales + brasasAlFundir(s) >= x * s.fuego.brasasTotales - 1e-9
}
