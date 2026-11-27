// Capa 2 (beta), fase 10: el bot de balance/sim_capa2.py jugando la Capa 2 entera con el núcleo real, desde la partida real de fin de
// Capa 1 (migrada a 1e308) hasta la Ignición (5.778 K), contra la tabla de docs/capa2/ritmo_balance.md.
// Lento (varios minutos): no corre con `npm test`; correrlo con `npm run test:capa2`.
import { beforeAll, describe, expect, it } from 'vitest'
import REAL from '../docs/capa2/partidas/mi_partida_fin_capa1.txt?raw'
import {
  AUTOS, CARGAS, CFG, CFG1, COMPRAS_ESQUIRLAS, DEFECTOS, MEJORAS_HORNO, MUTACIONES, NODOS_FUEGO, SECTORES, abandonarDefecto, aporteEscarcha,
  brasasAlFundir, cargaActual, cargaHecha, cargasAbiertas, cauceRel, colorSinEfecto, comprarConMargen, comprarEsquirla, comprarFuego, comprarTodo,
  comprimir, completo, costoEsquirlaLog10, costoHornoLog10, disponibles, ecoLog10, elegirSola, enDefecto, enElOptimo, enInfinito, entrarDefecto,
  equiparMejores, estadoInicial, extraSector, fundir, fusionAutomatica, fusionarTodo, fusionInfinito, cristalesAlInfinito, hayEstratos, hitoColor,
  ignicion, infinitoRoto, infinito, memoria, metaLog10, multAnillos, multCascada, multColor, mutEf, mutacionesRel, nivelRed, ponerReparto,
  precioFuego, presion, puedeComprimir, puedeEntrar, puedeFundir, puedeComprarEsquirla, puedeMejorarHorno, mejorarHorno, puedeRomperEscarcha,
  romperEscarcha, sectorAbierto, temperatura, tick, tieneFuego, topeCristales,
  type DefectoId, type ItemId, type State,
} from '../src/core'
import { importar } from '../src/guardado/guardado'
import L2 from '../balance/config_capa2.json'
import { esquirlas, tienda } from './bot'

const lento = import.meta.env.MODE !== 'lento'
const H = 3600
// El juego lee CFG2 (solo lo que usa); lo del bot y los objetivos están en el mismo archivo, sin tipo en config2.ts.
const C2 = L2 as unknown as Omit<typeof L2, 'objetivos' | 'primeras_vueltas_min'> & { objetivos: [string, number, number, string][]; primeras_vueltas_min: [number, number] }
const DF = C2.defectos, MOT = C2.motor, FU = C2.fundicion
const REQ = FU.requisito_log10
const ARENA = ['energia', 'granos', 'caudal', 'colores', 'cascada', 'tiempoCorrida', 'compresiones', 'mutaciones', 'maxEnergia', 'coloresDesbloqueados'] as const

/** logV_parts de sim_capa1/sim_capa2 (mismas fuentes y mismo reparto que el simulador: el Cauce aparte, el sector Pila sobre colores
 * y Cauce, las recompensas de los Defectos dentro de cada fuente). La Densidad y la Temperatura multiplican todo y no son fuente. */
function fuentes(s: State): Record<string, number> {
  const col = s.colores.reduce((a, n, i) => (colorSinEfecto(s, i) ? a : a + multColor(i, n, hitoColor(s)).log10()), 0)
  const pila = extraSector(s, 'pila')
  return {
    colores: col * pila, cauce: col * cauceRel(s) * pila, anillos: multAnillos(s).log10(), cascada: multCascada(s).log10(),
    mutaciones: mutEf(s, 'colores') * (1 + mutacionesRel(s)) * Math.log10(CFG.mutaciones.colores.por_nivel),
    presion: hayEstratos(s) ? presion(s) : 0, eco: ecoLog10(s), escarcha: aporteEscarcha(s),
  }
}
function pesos(p: Record<string, number>): Record<string, number> {
  const tot = Object.values(p).reduce((a, v) => a + Math.max(0, v), 0)
  return tot > 0 ? Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Math.max(0, v) / tot])) : {}
}

/** siguiente_fuego: el nodo de fuego más barato que falta (empate: el orden de la tabla). */
const siguienteFuego = (s: State) => NODOS_FUEGO.filter((k) => !tieneFuego(s, k)).sort((a, b) => precioFuego(a) - precioFuego(b))[0] as string | undefined
/** Hay un nodo de fuego pagable esperando que su nodo llegue a nv4 en esta vuelta. */
const pendiente = (s: State) => { const k = siguienteFuego(s); return !!k && precioFuego(k) <= s.fuego.brasas && nivelRed(s, k) < 4 }

export interface Vuelta { nF: number; t0: number; dur: number }
export interface Partida2 { eventos: Record<string, number>; sentidas: number[]; vueltas: Vuelta[]; fuentes: { t: number; nF: number; w: Record<string, number> }[]; s: State; t: number }

/** Port de _simular de sim_capa2.py. El tiempo cuenta desde la primera Fundición (la partida real ya está en el tope). Los
 * autocompradores, la Compresión y el Infinito automáticos los hace tick() (el Infinito en el óptimo); el bot agrega la regla del
 * simulador (apenas da el tope o, pasado bot_infinito_s, apenas multiplica ×10 los Cristales totales). */
export function jugar2(revisa = 15, tmax = 14 * H): Partida2 {
  let s: State = importar(REAL).estado
  s = {
    ...s,
    auto: { ...s.auto, ...Object.fromEntries(AUTOS.map((k) => [k, true])), fundicion: false, escarcha_mejoras: false }, // las mejoras de la Escarcha las compra el bot
    automat: { ...estadoInicial().automat, infinito: { modo: 'optimo', log10: 0, mult: Math.log10(CFG1.infinito_auto.multiplicar_x) } },
    relicario: { ...s.relicario, regla: { ...s.relicario.regla, equipar: true } },
  }
  const ev: Record<string, number> = {}, sentidas: number[] = [], vueltas: Vuelta[] = [], fts: Partida2['fuentes'] = []
  let t = 0
  const marca = (k: string, sentida = true) => { if (!(k in ev)) ev[k] = t; if (sentida) sentidas.push(t) }
  const calor = () => { if (temperatura(s) >= 3000) marca('3000 K', false); if (ignicion(s)) marca('Ignicion', false); return ignicion(s) }
  // El reparto del bot (reparto_bot / ajustar_reparto de sim_capa2.py)
  let wPila = MOT.reparto_bot.pila, sinEstratos = false, sinEscarcha = false
  const repartoBot = (x: State) => {
    const w = SECTORES.map((k) => (k !== 'pila' && sectorAbierto(x, k) && !(k === 'estratos' && sinEstratos) && !(k === 'escarcha' && sinEscarcha) ? MOT.reparto_bot[k as keyof typeof MOT.reparto_bot] : 0))
    const tot = w.reduce((a, b) => a + b, 0)
    return ponerReparto(x, SECTORES.map((k, i) => (k === 'pila' ? wPila : ((1 - wPila) * w[i]) / tot)))
  }
  const defCtot: Partial<Record<DefectoId, number>> = {} // Cristales totales con que ganó cada Defecto (carga 1) la vuelta anterior
  const reintentoT: Record<string, number> = {} // cargas 2–5 que fallaron: se reintentan con más Temperatura
  const basicos = (x: State) => disponibles(x).filter((id) => (id === 'caudal' || id.startsWith('color')) && !colorSinEfecto(x, Number(id.slice(5))))
  const muts = MUTACIONES.map((m): ItemId => `mut_${m}`)

  /** elegir_defecto: la carga 1 (se rehace en cada vuelta) con las reglas de la Capa 1; las cargas 2–5 solo en el tope, antes de
   * fundir, pocas por vuelta, la más baja primero. */
  const elegir = (x: State, listo: boolean, intentos: number): [DefectoId | null, number] => {
    const ctot = Math.max(0, x.cristalesTotales.log10())
    for (const d of DEFECTOS) if (!completo(x, d) && puedeEntrar(x, d) && !((x.defectos.reintento[d] ?? -Infinity) > ctot)) return [d, 1]
    if (!listo || intentos >= DF.bot_cargas_por_vuelta) return [null, 1]
    const ok = DEFECTOS.map((d, i) => ({ d, i, n: cargaHecha(x, d) + 1 }))
      .filter(({ d, n }) => completo(x, d) && n <= CARGAS && cargasAbiertas(x, d) && temperatura(x) >= (reintentoT[`${d}${n}`] ?? 0))
      .sort((a, b) => a.n - b.n || a.i - b.i)
    return ok.length ? [ok[0].d, ok[0].n] : [null, 1]
  }

  vuelta: while (t < tmax) {
    // ---- fundir
    s = fundir(s)
    marca(`Fundicion ${s.fuego.fundiciones}`)
    if (calor()) break
    // ---- vuelta nueva: hasta el primer Infinito, todo el calor a Pila
    s = ponerReparto(s, [1, 0, 0, 0, 0])
    s = { ...s, defectos: { ...s.defectos, reintento: Object.fromEntries(Object.entries(defCtot).map(([d, c]) => [d, c - CFG1.defectos.reintento_cristales_totales_log10])) } }
    const t0 = t, nF = s.fuego.fundiciones
    let tv = 0, listoT: number | null = null, primero = true, intentos = 0, quiereFundir = false, proxima = t
    let ultima: State | null = null, ultimaDefecto = false, antes = s
    let hist: [number, number][] = []
    for (;;) {
      const dt = s.tiempoCorrida < 30 ? 0.5 : s.tiempoCorrida < 300 ? 1 : 2
      const inf0 = s.infinitos, def = s.defectos.actual as DefectoId | '', n = cargaActual(s)
      antes = s
      s = tick(s, dt)
      t += dt; tv += dt
      let fin = s.infinitos !== inf0, abandono = false
      if (!fin) {
        const humano = t >= proxima
        if (humano) {
          proxima = t + revisa
          s = comprarTodo(s, basicos(s))
          s = comprarConMargen(s, ['cascada'], Infinity)
          s = comprarConMargen(s, muts, Infinity)
          if (puedeComprimir(s)) s = comprimir(s)
          if (puedeRomperEscarcha(s)) s = romperEscarcha(s)
        }
        // FIN_INF de sim_capa2.py (a mano o con Memoria nv4); sin Memoria, también el óptimo a mano
        if (!enDefecto(s) && enInfinito(s) && (humano || memoria(s) >= 4)) {
          const lc = cristalesAlInfinito(s).log10(), tope = fusionInfinito(s) ? Infinity : REQ
          const x10 = Math.max(0, s.cristalesTotales.log10()) + Math.log10(CFG1.infinito_auto.multiplicar_x)
          if (!infinitoRoto(s) || lc >= tope || (s.tiempoInfinito >= C2.bot_infinito_s && lc >= x10) || (memoria(s) < 4 && enElOptimo(s))) {
            antes = s
            s = infinito(s)
            fin = true
          }
        }
        if (!fin && enDefecto(s)) { // abandona como en la Capa 1, con los minutos de la Capa 2
          const e = s.maxEnergia.log10()
          hist.push([t, e])
          while (hist.length > 1 && hist[1][0] <= t - DF.abandono_ventana_min * 60) hist.shift()
          if (s.tiempoInfinito >= DF.abandono_revisar_min * 60) {
            const ritmo = (e - hist[0][1]) / Math.max(1e-9, (t - hist[0][0]) / 60)
            const falta = metaLog10(def as DefectoId, n) - e
            if (ritmo <= 0 || falta / ritmo > DF.abandono_meta_max_min || s.tiempoInfinito >= DF.abandono_min * 60) {
              if (n > 1) reintentoT[`${def}${n}`] = temperatura(s) * DF.reintento_T_x
              s = abandonarDefecto(s)
              fin = abandono = true
            }
          }
        }
      }
      if (!fin) continue
      // ---- entre dos corridas (lo que sigue a play_arena en _simular)
      hist = []
      if (def && !abandono && n > 1) {
        marca(`carga ${n} ${def}`)
        if (s.fuego.cargas.every((c) => c === CARGAS)) marca('cargas 5 completas', false)
      } else if (def && !abandono) defCtot[def] = Math.max(0, antes.cristalesTotales.log10())
      if (!abandono && n <= 1 && (!ultima || !def || ultimaDefecto)) { ultima = antes; ultimaDefecto = !!def } // para el desglose: mejor una corrida sin Defecto
      if (s.relicario.pendiente) s = elegirSola(s)
      if (!fusionAutomatica(s)) s = equiparMejores(fusionarTodo(s))
      s = tienda(s, t, [])
      const m0 = Object.values(s.escarcha.mejoras).reduce((a, b) => a + b, 0)
      s = esquirlas(s, t, [])
      if (tieneFuego(s, 'frio') && Object.values(s.escarcha.mejoras).reduce((a, b) => a + b, 0) > m0) sentidas.push(t) // eternas: se sienten
      if (primero) { s = repartoBot(s); primero = false }
      // comprar: nodos de fuego (con el nodo en nv4), el Horno con Vidrio y Esquirla de fuego / Geoda, lo más barato primero
      for (let k = siguienteFuego(s); k && precioFuego(k) <= s.fuego.brasas && nivelRed(s, k) >= 4; k = siguienteFuego(s)) {
        s = comprarFuego(s, k)
        marca(`fuego ${k}`)
      }
      for (;;) {
        const k = MEJORAS_HORNO.reduce((a, b) => (costoHornoLog10(b, s.fuego.horno[b]) < costoHornoLog10(a, s.fuego.horno[a]) ? b : a))
        if (!puedeMejorarHorno(s, k)) break
        s = mejorarHorno(s, k)
        marca(`Horno ${k} nv${s.fuego.horno[k]}`)
      }
      for (;;) {
        const k = COMPRAS_ESQUIRLAS.reduce((a, b) => (costoEsquirlaLog10(b, s.fuego.compras[b]) < costoEsquirlaLog10(a, s.fuego.compras[a]) ? b : a))
        if (!puedeComprarEsquirla(s, k)) break
        s = comprarEsquirla(s, k)
        marca(`Esquirlas ${k} nv${s.fuego.compras[k]}`)
      }
      if (calor()) { vueltas.push({ nF, t0, dur: t - t0 }); break vuelta }
      // ---- ¿fundir? en el tope, sin nodo de fuego pagable esperando su nv4; antes, las cargas que toquen
      const elegirSiguiente = () => {
        const [d, c] = elegir(s, quiereFundir, intentos)
        if (d) { intentos += c > 1 ? 1 : 0; s = entrarDefecto(s, d) }
      }
      if (!puedeFundir(s)) { elegirSiguiente(); continue }
      listoT ??= tv
      if (pendiente(s) && tv - listoT < FU.espera_fuego_max_min * 60) { elegirSiguiente(); continue }
      if (fusionInfinito(s) && brasasAlFundir(s) < FU.bot_multiplicar_x * s.fuego.brasasTotales && tv - listoT < FU.bot_espera_fusion_min * 60) { elegirSiguiente(); continue }
      quiereFundir = true
      if (elegir(s, true, intentos)[1] > 1) { elegirSiguiente(); continue }
      break
    }
    vueltas.push({ nF, t0, dur: t - t0 })
    // desglose al fundir: la Arena de la última corrida (sin la regla del Defecto), con la Red, los Estratos y la Escarcha de ahora
    const u = ultima ?? s
    const m: State = { ...s, ...Object.fromEntries(ARENA.map((k) => [k, u[k]])), defectos: { ...s.defectos, actual: '' } }
    const w = pesos(fuentes(m))
    fts.push({ t, nF, w })
    const obj = MOT.bot_objetivo_fuente, col = Math.max(w.colores ?? 0, w.cauce ?? 0)
    const [ok, ov] = Object.entries(w).filter(([k]) => k !== 'colores' && k !== 'cauce').reduce((a, b) => (b[1] > a[1] ? b : a))
    if (col > obj) wPila *= 0.85
    else if (ov > obj) wPila = Math.min(1, wPila / 0.85 + 0.05)
    sinEstratos = ok === 'presion' && ov > obj
    sinEscarcha = ok === 'escarcha' && ov > obj
  }
  return { eventos: ev, sentidas, vueltas, fuentes: fts, s, t }
}

/** chequear de sim_capa2.py: los hitos (con "vueltas de 3–5 min"), la peor fuente desde la 2.ª vuelta, el hueco máximo y las vueltas largas. */
export function chequear(p: Partida2) {
  const ev = { ...p.eventos }
  const vs = 'Ignicion' in ev ? p.vueltas.slice(0, -1) : p.vueltas
  let i = vs.length
  while (i > 5 && vs[i - 1].dur <= 300) i--
  if (i < vs.length) ev['vuelta <= 5 min'] = vs[i].t0
  const filas = C2.objetivos.map(([nombre, a, b, clave]) => {
    const t = ev[clave]
    return { nombre, a, b, t, ok: t !== undefined && (a - C2.tolerancia_h) * H - 1 <= t && t <= (b + C2.tolerancia_h) * H + 1 }
  })
  let peor = { w: 0, k: '', nF: 0 }
  for (const f of p.fuentes.slice(1)) for (const [k, w] of Object.entries(f.w)) if (w > peor.w) peor = { w, k, nF: f.nF }
  const ts = [...p.sentidas].sort((a, b) => a - b)
  const hueco = ts.slice(1).reduce((m, x, j) => (x - ts[j] > m.d ? { d: x - ts[j], desde: ts[j] } : m), { d: 0, desde: 0 })
  const [a, b] = C2.primeras_vueltas_min
  const largas = [
    ...p.vueltas.slice(5).filter((v) => v.dur > C2.vuelta_max_min_desde_la_6 * 60),
    ...p.vueltas.slice(1, 4).filter((v) => !(0.75 * a * 60 <= v.dur && v.dur <= 1.25 * b * 60)),
  ]
  return { filas, peor, hueco, largas }
}

const hm = (t: number) => { const m = Math.round(t / 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` }

describe.skipIf(lento)('balance de la Capa 2: núcleo real, revisa cada 15 s (lento)', () => {
  let p: Partida2, c: ReturnType<typeof chequear>
  beforeAll(() => {
    p = jugar2(15)
    c = chequear(p)
    console.log([
      `Capa 2 en el núcleo: ${hm(p.t)} h, ${p.s.fuego.fundiciones} Fundiciones, T ${Math.round(temperatura(p.s))} K, Brasas totales ${p.s.fuego.brasasTotales}`,
      ...c.filas.map((f) => `  ${f.nombre.padEnd(44)} ${f.a === f.b ? hm(f.a * H) : `${hm(f.a * H)}-${hm(f.b * H)}`}  ${f.t === undefined ? '--' : hm(f.t)}  ${f.ok ? 'ok' : 'FUERA'}`),
      `  en rango: ${c.filas.filter((f) => f.ok).length}/${c.filas.length}`,
      `  fuente más pesada al fundir (desde la 2.ª vuelta): ${c.peor.k} ${(100 * c.peor.w).toFixed(1)} % (vuelta ${c.peor.nF})`,
      `  hueco máximo: ${(c.hueco.d / 60).toFixed(1)} min (desde ${hm(c.hueco.desde)})`,
      `  vueltas 2.ª a 4.ª: ${p.vueltas.slice(1, 4).map((v) => (v.dur / 60).toFixed(0)).join(', ')} min; largas: ${c.largas.map((v) => `F${v.nF} ${(v.dur / 60).toFixed(0)}`).join(', ') || 'ninguna'}`,
    ].join('\n'))
  }, 60 * 60_000)

  it('la partida real arranca en el tope y se puede fundir', () => {
    const r = importar(REAL).estado
    expect(r.cristalesTotales.eq(topeCristales(r))).toBe(true)
    expect(puedeFundir(r)).toBe(true)
  })
  it('llega a la Ignición (5.778 K) entre las 10 y las 12 h (±30 min)', () => {
    expect(p.eventos.Ignicion / H).toBeGreaterThanOrEqual(10 - C2.tolerancia_h)
    expect(p.eventos.Ignicion / H).toBeLessThanOrEqual(12 + C2.tolerancia_h)
  })
  it('cada hito de la tabla, en su ventana ±30 min', () => {
    expect(c.filas.filter((f) => !f.ok).map((f) => `${f.nombre} ${f.t === undefined ? '--' : hm(f.t)}`)).toEqual([])
  })
  it(`ninguna fuente pasa del ${100 * C2.fuente_max} % al fundir (desde la 2.ª vuelta)`, () => expect(c.peor.w).toBeLessThanOrEqual(C2.fuente_max))
  it(`nunca más de ${C2.hueco_max_min} min sin una compra que se sienta`, () => expect(c.hueco.d).toBeLessThan(C2.hueco_max_min * 60))
  it('vueltas 2.ª a 4.ª de 20–30 min y ninguna de más de 20 min después de la 5.ª', () => expect(c.largas).toEqual([]))
})
