// Bucle del juego: lo único que conoce el tiempo real. La economía vive en src/core.
import { CFG, abandonarDefecto, anillos, enDefecto, entrarDefecto, metaLog10, type DefectoId, autoDisponible, comprimir, conFoto, cristalesAlInfinito, campoInvalido, enInfinito, estadoInicial, infinitoRoto, fueraDeLineaPasos, finCapa1, hayEstratos, infinito, mutacionesDisponibles, reliquiasPorInfinito, tick, topeCristales, type Ausencia, type State } from '../core'
import { almacenLocal, type Almacen } from '../guardado/almacen'
import { cargar, guardar, type MarcaBeta, type Partida } from '../guardado/guardado'
import { entrarBeta, volverDeBeta } from '../guardado/beta'
import { historialVacio, registrar } from '../guardado/historial'
import { instantanea } from '../render/instantanea'
import type { Toma } from '../render/marcos'
import { PX_MAX, type Medidas } from '../render/pilaVisual'
import { txt } from '../strings'
import { avisoActivo, uiMs, type Aviso } from './ajustes.svelte'
import { formato } from './formato'
import { mirar as mirarStats } from './estadisticasAnonimas'
import { nuevosLogros, primerDerrumbe } from './logros'
import { Vigia, contadoresVacios, transicion, volviste } from './secretos'

const PASO = 0.05 // s: paso fijo de la economía (SPEC 8)
const MAX_PASOS = 200 // por cuadro; con más tiempo acumulado (pestaña oculta, carga) va la simulación fuera de línea
const GUARDAR_CADA = 10_000 // ms (SPEC 8; v1.0 pide como mínimo cada 30 s)
let ultimoMalo = '' // para no llenar la consola con el mismo error en cada cuadro
const AVISAR_DESDE = 60 // s de ausencia para mostrar "Mientras no estabas"
/** s sin que corra el bucle (la app en segundo plano o la máquina suspendida): eso es una ausencia, con sus reglas (offline.ts).
 * Con la pestaña oculta el bucle sigue una vez por segundo (Chrome lo espacia hasta una vez por minuto): eso no es ausencia. */
const SIN_BUCLE_S = 120

class Juego {
  s = $state.raw(estadoInicial())
  /** CORRECCIONES 1: el estado que muestran los números (tienda y contadores): `s` a 10 Hz como mucho (App.svelte). */
  ver = $state.raw(estadoInicial())
  velocidad = $state(1)
  /** Debug: nivel simulado de todos los colores para ver el brillo de la pila (0 = el real). */
  nivelColores = $state(0)
  /** Rendimiento de la pila visual, una vez por segundo (panel de debug). */
  medidas = $state.raw<Medidas | null>(null)
  /** Etiqueta de escala de la pila (la escribe Pila.svelte). */
  escalaK = $state(0)
  /** SPEC 5: partes de la interfaz que ya aparecieron. Nunca se esconden. */
  vistos = $state.raw<Record<string, boolean>>({})
  /** Radio de la pila en px CSS (lo escribe Pila.svelte; el anillo de Compresión lo rodea). */
  radioPila = $state(0)
  /** La frase de la última aparición. */
  aviso = $state.raw<{ id: number; texto: string } | null>(null)
  /** Segundos de juego estimados hasta la meta de Compresión (null si no hay ritmo para medir). */
  eta = $state<number | null>(null)
  /** La avalancha más grande de la pila visual, en derrumbes. */
  record = $state(0)
  /** Capa 2, fase 1B: la marca de beta de la partida (preguntar con `esBeta(juego)`). */
  beta = $state.raw<MarcaBeta | undefined>(undefined)
  /** C8: fracción hecha del cálculo de la ausencia (null = no hay cálculo en curso). */
  calculo = $state<number | null>(null)
  /** "Mientras no estabas": lo que pasó en la última ausencia, hasta que se cierra. */
  ausencia = $state.raw<Ausencia | null>(null)
  /** El guardado no se pudo leer: no se guarda nada hasta que el jugador acepta empezar de nuevo. */
  guardadoRoto = $state(false)
  /** I1: el juego está abierto en otra pestaña (tiene el candado): esta no simula ni guarda. */
  otraPestana = $state(false)
  /** I3: los últimos guardados fallaron (almacenamiento lleno, bloqueado o privado). */
  sinGuardar = $state(false)
  /** SPEC 7: logros conseguidos. */
  logros = $state.raw<Record<string, boolean>>({})
  /** El último aviso de logro (notificación discreta). */
  logro = $state.raw<{ id: number; claves: string[] } | null>(null)
  /** Sube una vez por segundo: Estadísticas relee `historial` (que se muta sin $state, cambia con cada avalancha). */
  verHistorial = $state(0)
  /** Panel abierto sobre la pila: Estadísticas, Logros o Ajustes. */
  panel = $state<'estadisticas' | 'logros' | 'ajustes' | 'ayuda' | null>(null)
  /** Sistemas recién aparecidos que esperan su indicador (Guia.svelte), en orden. Claves de `vistos`. */
  guias = $state.raw<string[]>([])
  /** Pantalla de título (siempre al cargar): la economía espera y el fuera de línea se calcula recién al entrar. */
  titulo = $state(false)
  /** Hay partida para seguir (el título dice "Continuar"). */
  hayPartida = $state(false)
  /** La primera avalancha después del primer toque ya pasó (Pila.svelte; el contador de Energía salta). */
  primera = $state(false)
  /** Zoom de la pila en px CSS por celda; 0 = encuadre automático. Se guarda con la partida. */
  zoom = $state(0)
  /** px CSS por celda del encuadre automático, el zoom mínimo (lo escribe Pila.svelte). */
  zoomMin = $state(PX_MAX)
  /** Segundos reales con el zoom al máximo en la Compresión actual (logro Microscopio). Sin $state: sube cada cuadro. */
  zoomMaxS = 0
  /** Sube con cada Compresión o Infinito hechos a mano: solo esos suenan (Pila.svelte). Sin $state. */
  aMano = 0
  /** Sube con cada salto fuera de línea: Pila.svelte no anima lo que pasó en la ausencia. */
  saltos = 0
  /** Logro secreto Arena: la lluvia de granos que se ve ahora (Pila.svelte), o null. */
  lluvia = $state.raw<{ id: number } | null>(null)
  /** El último anillo ganado: su aviso va junto al contador de anillos (App.svelte), no sobre la pila. */
  anilloNuevo = $state.raw<{ id: number; texto: string } | null>(null)
  /** SPEC_CAPA1 §11: la capa que se ve. Cristalización aparece con el primer Infinito (Capas.svelte). */
  capa = $state<'arena' | 'cristalizacion' | 'automatizacion' | 'capa2'>('arena')
  /** La pantalla de Cristalización que se ve (Capas.svelte; la flecha "↓ Estratos" de la Arena la cambia). */
  pantalla = $state('red')
  /** La cinemática que corre (Pila.svelte la dibuja): la del primer Infinito o la del fin de la Capa 1. */
  cinematica = $state<'' | 'infinito' | 'fin'>('')
  /** El Infinito automático eligió una reliquia por primera vez con la regla por defecto: la nota con "Configurar" (App.svelte). */
  notaReliquia = $state.raw<{ tipo: string } | null>(null)
  /** "Configurar" de esa nota: Automatización abre en la regla de las reliquias. */
  irReliquia = $state(false)
}
export const juego = new Juego()
if (import.meta.env.DEV) Object.assign(globalThis, { juego }) // para probar desde la consola

/** Historial para Estadísticas (corridas, avalanchas, Energía en el tiempo). Se muta en el lugar: ver juego.verHistorial. */
export let historial = historialVacio(Date.now())

/** Sismógrafo: derrumbes de cada avalancha de la pila visual que todavía no se dibujó. Sin $state: lo vacía un canvas. */
export const sismo: number[] = []

/** La pila del juego para la foto del mandala (la pone Pila.svelte). */
export const camara: { foto: (() => Toma) | null } = { foto: null }

/** El zoom que se ve, en px CSS por celda. */
export const zoomActual = () => Math.min(Math.max(juego.zoom, juego.zoomMin), PX_MAX)
/** Pegado al mínimo vuelve al encuadre automático (que sigue a la pila cuando crece). */
export const ponerZoom = (z: number) => (juego.zoom = z <= juego.zoomMin * 1.02 ? 0 : Math.min(z, PX_MAX))
/** La barra: 0 = la pila entera, 1 = zoom máximo, en escala logarítmica. */
export const zoomT = () => (juego.zoomMin < PX_MAX ? Math.log(zoomActual() / juego.zoomMin) / Math.log(PX_MAX / juego.zoomMin) : 0)
export const ponerZoomT = (t: number) => ponerZoom(juego.zoomMin * (PX_MAX / juego.zoomMin) ** t)
/** Zoom al máximo elegido por el jugador (con 5 granos el encuadre ya está ahí: eso no cuenta). */
export const enZoomMaximo = () => juego.zoom >= PX_MAX

const log10E = (s: State) => (s.energia.gt(1) ? s.energia.log10() : 0)

/**
 * Compresión: la meta y el progreso hacia ella en escala logarítmica, del umbral anterior (0 para la primera).
 * Después de la última Compresión la meta es el Infinito (`final`).
 */
export function progresoCompresion(s: State) {
  const u = CFG.compresion.umbrales_log10
  const final = s.compresiones >= u.length
  // En un Defecto la meta final es la del Defecto (§8), no el Infinito.
  const meta = final ? (enDefecto(s) ? metaLog10(s.defectos.actual as DefectoId) : CFG.infinito_log10) : u[s.compresiones]
  const desde = u[s.compresiones - 1] ?? 0
  // Llegó al Infinito (la misma condición que el botón): 100 %, sin depender del redondeo del log10.
  const llego = final && !enDefecto(s) && enInfinito(s)
  return { meta, final, p: llego ? 1 : Math.min(1, Math.max(0, (log10E(s) - desde) / (meta - desde))) }
}

/** La barra fina de la izquierda (escala log10): cuánto falta para el Infinito y dónde caen los umbrales de Compresión. */
/** Con el Infinito roto: log10(Cristales totales) sobre el fin de la Capa 1 (1e308, finCapa1). */
export const caminoCapa2 = (s: State) => Math.min(1, Math.max(0, s.cristalesTotales.log10()) / CFG.infinito_log10)

export function caminoInfinito(s: State) {
  return { p: enInfinito(s) ? 1 : Math.min(1, log10E(s) / CFG.infinito_log10), marcas: CFG.compresion.umbrales_log10.map((u) => u / CFG.infinito_log10) }
}

// Tiempo estimado: ritmo de log10(Energía) en los últimos ~30 s de juego (crece exponencial, así que se mide en log).
const VENTANA_ETA = 30
const muestras: [number, number][] = [] // [tiempoTotal, log10 E], una por segundo de juego
let compMuestras = -1
function medirEta(s: State) {
  if (s.compresiones !== compMuestras) { muestras.length = 0; compMuestras = s.compresiones } // corrida nueva
  const ult = muestras.at(-1)
  if (ult && s.tiempoTotal - ult[0] < 1) return
  muestras.push([s.tiempoTotal, log10E(s)])
  if (muestras.length > VENTANA_ETA) muestras.shift()
  const [t0, e0] = muestras[0]
  const ritmo = muestras.length >= 3 ? (log10E(s) - e0) / (s.tiempoTotal - t0) : 0
  juego.eta = ritmo > 0 ? Math.max(0, (progresoCompresion(s).meta - log10E(s)) / ritmo) : null
}

/** Guías de la Capa 1 que no se llaman como su pantalla. */
const PANTALLA_GUIA: Record<string, string> = { c1_anillo3: 'red', c1_pulido: 'relicario', c1_defectos2: 'defectos' }

/** SPEC 5: cuándo aparece cada parte. */
function condiciones(s: State): Record<string, boolean> {
  const e = s.maxEnergia
  const c: Record<string, boolean> = {
    derrumbes: primerDerrumbe(s),
    tienda: e.gte(CFG.revelado.tienda),
    color0: e.gte(CFG.revelado.ambar),
    anillos: anillos(s.granos) > 0 || s.compresiones > 0,
    compresion: e.log10() >= CFG.revelado.compresion_log10,
    cascada: s.compresiones >= CFG.cascada.compresiones_para_desbloquear,
    mutaciones: mutacionesDisponibles(s),
  }
  for (let i = 1; i < CFG.colores.length; i++) c[`color${i}`] = s.coloresDesbloqueados > i
  for (const k of Object.keys(CFG.autocompradores)) c[`auto_${k}`] = autoDisponible(s, k)
  // Correcciones, bloque 12: las guías de la Capa 1 salen la primera vez que se mira cada pantalla (así llegan de a una).
  // Defectos y Escarcha salen cuando están abiertas.
  const cris = s.infinitos > 0 && juego.capa === 'cristalizacion' && !!juego.vistos.cristales
  c.c1_cristales = cris
  for (const p of ['relicario', 'red']) c[`c1_${p}`] = cris && juego.pantalla === p
  c.c1_estratos = cris && juego.pantalla === 'estratos' && hayEstratos(s)
  c.c1_automat = s.infinitos > 0 && juego.capa === 'automatizacion'
  // C6: la presentación de Romper el Infinito sale en la Arena, la primera vez que la Energía pasa de 1e308.
  c.c1_romper = infinitoRoto(s) && enInfinito(s) && s.infinitos > 0
  // C7: la de Defectos, una sola vez al desbloquearlos (Defectos nv1); espera en cola a que se mire su pantalla.
  c.c1_defectos = s.infinitos > 0 && (s.red.defectos ?? 0) >= 1
  c.c1_escarcha = cris && juego.pantalla === 'escarcha' && s.escarcha.abierta
  // C14: lo que la 1.2 suma a pantallas que ya conocías, la primera vez que las mirás con la Escarcha abierta.
  for (const [k, p] of Object.entries(PANTALLA_GUIA)) c[k] = cris && juego.pantalla === p && s.escarcha.abierta
  return c
}

/** Las guías de la Capa 1 se muestran fuera de la Arena; las demás, en la Arena. */
export const esGuiaCapa1 = (k: string) => k.startsWith('c1_')
/** La guía se puede mostrar ahora: la de cada pantalla, solo con esa pantalla al frente (si quedó en cola, espera). */
export function guiaEnSuLugar(k: string): boolean {
  if (!esGuiaCapa1(k)) return juego.capa === 'arena'
  if (k === 'c1_automat') return juego.capa === 'automatizacion'
  if (k === 'c1_romper') return juego.capa === 'arena'
  return juego.capa === 'cristalizacion' && (k === 'c1_cristales' || juego.pantalla === (PANTALLA_GUIA[k] ?? k.slice(3)))
}

/** Nombre de lo que compra cada autocomprador (claves de AUTOS). */
export const nombreAuto = (k: string) => txt.automat.nombres[k] ?? txt.colores[CFG.colores.findIndex((c) => c.id === k)]

const esAuto = (k: string) => k.startsWith('auto_') && !(k in txt.guia.indicador)

/** CORRECCIONES 4, migración: da por vistas (sin mostrarlas) las guías de todo lo que el jugador ya tiene. Los guardados de
 * antes no anotaban la guía de los autocompradores (`vistos.auto`); `vistos.guias` marca que esto ya se hizo. */
export function yaVisto(s: State, vistos: Record<string, boolean>): Record<string, boolean> {
  const c = condiciones(s)
  const r = { ...vistos, ...Object.fromEntries(Object.keys(c).filter((k) => c[k]).map((k) => [k, true])), guias: true }
  return Object.keys(r).some(esAuto) ? { ...r, auto: true } : r
}

let avisos = 0
const AVISOS_JUNTOS = 2
/** Un aviso de abajo, si el jugador no apagó ese tipo en Ajustes. */
const avisar = (k: Aviso, texto: string) => { if (avisoActivo(k)) juego.aviso = { id: avisos++, texto } }

// Auditoría 1.1: el Infinito automático llega cada pocos segundos; sus Cristales (y sus reliquias) van juntos en un aviso
// cada 30 s de juego. Cristales y reliquias se apagan por separado en Ajustes.
const AVISO_AUTO_S = 30
const auto = { n: 0, base: estadoInicial().cristalesTotales, desde: -Infinity, reliquias: {} as Record<string, number> }
export function avisoAutomatico(antes: State, s: State) {
  if (!auto.n) auto.base = antes.cristalesTotales
  auto.n += s.infinitos - antes.infinitos
  if (s.tiempoTotal - auto.desde < AVISO_AUTO_S) return
  const x = formato(s.cristalesTotales.sub(auto.base))
  const r = txt.cristal.relicario
  const partes = [
    // En el tope de Cristales el Infinito no da ninguno: sin "+0 Cristales".
    avisoActivo('auto') && s.cristalesTotales.gt(auto.base) ? (auto.n > 1 ? txt.cristal.ganadosVarios(x, auto.n) : txt.cristal.ganados(x)) : '',
    avisoActivo('reliquia') && Object.keys(auto.reliquias).length
      ? r.ganadas(Object.entries(auto.reliquias).map(([t, n]) => (n > 1 ? `${r.tipos[t][0]} ×${n}` : r.tipos[t][0])).join(', ')) : '',
  ].filter(Boolean)
  if (partes.length) juego.aviso = { id: avisos++, texto: partes.join(' · ') }
  auto.n = 0
  auto.reliquias = {}
  auto.desde = s.tiempoTotal
}
/** La regla de reliquias tal como viene (state.ts): mientras siga así, la primera elección automática se explica. */
const reglaPorDefecto = (s: State) => JSON.stringify(s.relicario.regla) === JSON.stringify(estadoInicial().relicario.regla)
/** El Infinito automático eligió la reliquia con la regla de Automatización (sin pop-up). La primera vez, con la regla por
 * defecto, una nota que lo explica y lleva al panel; después va en el aviso juntado de avisoAutomatico. */
function reliquiaAutomatica(s: State) {
  // shortcut: toma el tipo de `ultimo`; con Engarces nv4 cuenta las dos como de ese tipo aunque la regla haya elegido dos distintos.
  const t = s.relicario.ultimo
  if (!t) return
  if (!juego.vistos.reliquia_auto && reglaPorDefecto(s)) {
    juego.vistos = { ...juego.vistos, reliquia_auto: true }
    juego.notaReliquia = { tipo: t }
    return
  }
  auto.reliquias[t] = (auto.reliquias[t] ?? 0) + reliquiasPorInfinito(s)
}
/** El pop-up de la reliquia (Paneles.svelte): un Infinito a mano dejó una esperando su tipo. La primera, la del primer
 * Infinito, se elige en el Relicario con su guía. */
export const hayEleccion = (): boolean => juego.s.relicario.pendiente > 1 && !juego.cinematica && !juego.titulo
/** Lo que aparece por primera vez: se anota en `juego.vistos` (va al guardado) y se muestra su frase y su guía.
 * CORRECCIONES 4: una sola vez en la vida de la partida, aunque la corrida se reinicie. Exportada para el test. */
export function revelar(s: State) {
  const c = condiciones(s)
  const nuevos = Object.keys(c).filter((k) => c[k] && !juego.vistos[k])
  if (!nuevos.length) return
  // La guía de los autocompradores es una sola para todos (`vistos.auto`): con el primero que llega, y nunca más.
  const primerAuto = juego.vistos.auto ? undefined : nuevos.find(esAuto)
  juego.vistos = { ...juego.vistos, ...Object.fromEntries(nuevos.map((k) => [k, true])), ...(primerAuto && { auto: true }) }
  // Los autocompradores que llegan juntos van en una sola frase; si aparecen muchas cosas juntas (saltos de debug), las últimas dos.
  const autos = nuevos.filter((k) => k.startsWith('auto_') && !(k in txt.revelado)).map((k) => nombreAuto(k.slice(5)))
  const frases = nuevos.filter((k) => k in txt.revelado).map((k) => txt.revelado[k])
  if (autos.length) frases.push(txt.autocompradores(autos))
  const guias = nuevos.filter((k) => k in txt.guia.indicador || k === primerAuto)
  if (guias.length) juego.guias = [...juego.guias, ...guias].slice(-AVISOS_JUNTOS)
  if (frases.length) avisar('revelado', frases.slice(-AVISOS_JUNTOS).join(' '))
}

let logrosAvisados = 0
/** Un logro secreto cumplido: se anota y se avisa una sola vez. */
function ganarSecreto(k: string) {
  if (juego.logros[k]) return
  juego.logros = { ...juego.logros, [k]: true }
  juego.logro = { id: logrosAvisados++, claves: [k] }
}
/** Los logros secretos que dependen del tiempo, los clics y las teclas (secretos.ts). */
export const vigia = new Vigia(contadoresVacios(), ganarSecreto)
/** Logro secreto «e»: el logo del estudio en Créditos. */
export const tocarLogo = () => ganarSecreto('firma')
let lluvias = 0
let finLluvia: ReturnType<typeof setTimeout>
function llover() {
  juego.lluvia = { id: lluvias++ }
  clearTimeout(finLluvia)
  finLluvia = setTimeout(() => (juego.lluvia = null), (CFG.secretos.arena.lluvia_s as number) * 1000)
}
function revisarLogros(s: State) {
  const nuevos = nuevosLogros(s, juego.record, juego.logros)
  if (!nuevos.length) return
  juego.logros = { ...juego.logros, ...Object.fromEntries(nuevos.map((k) => [k, true])) }
  juego.logro = { id: logrosAvisados++, claves: nuevos }
}

/** Bloque 8: la instantánea de la pila visual (la cara de la reliquia de cada Infinito); '' si la pila no está. */
const fotoPila = () => { const t = camara.foto?.(); return (t && instantanea(t.alturas)) || fotoActual }
// La última instantánea buena: si la pila de ahora es casi nada (recién reiniciada), queda la anterior.
let fotoActual = '', fotoEn = 0

/** El último estado que vio el bucle (el historial compara contra este). */
let previo = juego.s

/** Comprimir a mano (botón, tecla C): se anota en el historial con la Energía exacta de ese momento. */
export function comprimirYa() {
  const antes = juego.s
  juego.s = comprimir(antes)
  juego.aMano++
  transicion(antes, juego.s, juego.zoomMaxS).forEach(ganarSecreto)
  registrar(historial, antes, juego.s)
  previo = juego.s
}

/** Infinito (botón, tecla C o el final de la cinemática): cobra los Cristales y reinicia la Arena. */
export function infinitoYa() {
  const antes = juego.s
  if (!enInfinito(antes) || enDefecto(antes)) return // en un Defecto solo se termina en la meta o abandonando
  const s = conFoto(infinito(antes), fotoPila())
  juego.s = s
  juego.aMano++
  registrar(historial, antes, s)
  previo = s
  if (antes.cristalesTotales.lt(topeCristales(antes))) avisar('infinito', txt.cristal.ganados(formato(cristalesAlInfinito(antes)))) // en el tope no da
  guardarYa()
}

/** SPEC_CAPA1 §8: entrar a un Defecto (sale de la corrida sin Cristales) y abandonarlo. Llevan a la Arena / se quedan. */
export function entrarDefectoYa(id: DefectoId) {
  const s = entrarDefecto(juego.s, id)
  if (s === juego.s) return
  previo = juego.s = s
  juego.capa = 'arena'
  avisar('defectos', txt.cristal.defectos.entrado(txt.cristal.defectos.nombres[id]))
  guardarYa()
}
export function abandonarDefectoYa() {
  const id = juego.s.defectos.actual
  const s = abandonarDefecto(juego.s)
  if (s === juego.s) return
  vigia.abandono(id)
  previo = juego.s = s
  avisar('defectos', txt.cristal.defectos.abandonado(txt.cristal.defectos.nombres[id]))
  guardarYa()
}

/** SPEC_CAPA1 §11: el primer Infinito llega solo, con su cinemática; al terminar se cobra y se pasa a Cristalización.
 * Si se cierra la página antes, el estado sigue esperando el Infinito y la cinemática se repite al volver. */
export const CINEMATICA_MS = 3200
function primerInfinito() {
  juego.cinematica = 'infinito'
  setTimeout(() => {
    infinitoYa()
    juego.capa = 'cristalizacion'
    juego.cinematica = ''
  }, CINEMATICA_MS)
}

/** SPEC_CAPA1 §1, C13: con 1e308 Cristales totales la pila se cristaliza entera y se agrieta (Pila.svelte); después, la
 * pantalla "Capa 2 próximamente". Se anota en `vistos.capa2` (guardado): una vez por partida; si se cierra antes, se repite. */
export const FIN_CAPA_MS = 6400
function finDeCapa() {
  juego.capa = 'arena'
  juego.cinematica = 'fin'
  setTimeout(() => {
    juego.vistos = { ...juego.vistos, capa2: true }
    juego.capa = 'capa2'
    juego.cinematica = ''
    guardarYa()
  }, FIN_CAPA_MS)
}

/** La pista "Tocá la pila": hasta el primer Puñado (las partidas de antes no lo anotaban: con la tienda ya visible, tampoco). */
export const invitaTocar = () => !juego.vistos.punado && !juego.vistos.tienda

/** Hay un cartel o panel encima de todo (también de la barra de capas). */
export const hayCartel = (): boolean => juego.titulo || juego.panel !== null || juego.ausencia !== null || juego.guardadoRoto || juego.otraPestana || hayEleccion()
/** La Arena no está al frente: las teclas del juego (Espacio, M, C) no hacen nada. */
export const hayPanel = (): boolean => hayCartel() || juego.capa !== 'arena'

/** Reloj real (ms) hasta el que llegó la simulación. El guardado lleva esta fecha y no Date.now(): con la pestaña oculta
 * no hay cuadros, juego.s queda quieto y el guardado tiene que seguir diciendo de cuándo es (si no, se pierde la ausencia). */
let simuladoHasta = Date.now()

export const partidaActual = (): Partida =>
  ({ estado: juego.s, guardadoEn: simuladoHasta, vistos: juego.vistos, record: juego.record, logros: juego.logros, historial,
    zoom: juego.zoom, zoomMaxS: juego.zoomMaxS, secretos: vigia.c, beta: juego.beta })

let reemplazando = false
let fallos = 0
const FALLOS_PARA_AVISAR = 2
/** true si se guardó. */
export function guardarYa() {
  if (juego.guardadoRoto || juego.otraPestana || reemplazando) return false
  try {
    guardar(almacenLocal, partidaActual())
    fallos = 0
    juego.sinGuardar = false
    return true
  } catch (e) {
    console.warn(e) // sin lugar o sin permiso: el juego sigue, con el aviso fijo
    if (++fallos >= FALLOS_PARA_AVISAR) juego.sinGuardar = true
    return false
  }
}

/** Importar o borrar: escribe la partida y recarga, así entra por el mismo camino que una carga (fuera de línea, fotos de la pila).
 * false si no se pudo escribir: no recarga (volvería la partida vieja). */
export function reemplazarPartida(p: Partida | ((a: Almacen) => void)) {
  try { typeof p === 'function' ? p(almacenLocal) : guardar(almacenLocal, p) } catch (e) { console.warn(e); return false }
  reemplazando = true // que el pagehide no la pise con la de ahora
  location.reload()
  return true
}

/** Capa 2, fase 1B: con el código ya verificado y el aviso aceptado. Guarda "Antes de la beta", marca la partida y recarga. */
export const entrarALaBeta = (codigo: string) => reemplazarPartida((a) => entrarBeta(a, partidaActual(), codigo, Date.now()))
export const volverDeLaBeta = () => (guardarYa(), reemplazarPartida((a) => volverDeBeta(a, Date.now())))

export const borrarPartida = () =>
  reemplazarPartida({ estado: estadoInicial(), guardadoEn: Date.now(), vistos: {}, record: 0, logros: {}, historial: historialVacio(Date.now()) })

/** Toques, teclas y rueda en toda la página (Paciencia, Konami, Arena). */
function escucharSecretos() {
  const tocar = () => vigia.tocar(Date.now())
  for (const ev of ['pointerdown', 'wheel'] as const) addEventListener(ev, tocar, { capture: true, passive: true })
  const paneles: (typeof juego.panel)[] = [] // el panel antes de cada tecla
  // Antes que las teclas de App.svelte (se registra primero): la última tecla de un código no abre su panel (la A de Konami).
  addEventListener('keydown', (e) => {
    tocar()
    if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    paneles.push(juego.panel)
    if (paneles.length > 16) paneles.shift()
    const konami = juego.logros.konami
    const largo = vigia.tecla(e.code, e.key)
    if (largo) {
      llover()
      // La primera letra (la A de «arena») abrió Ajustes: se cierra, así se ve la lluvia.
      if (paneles[paneles.length - largo] === null) juego.panel = null
    }
    if (largo || (!konami && juego.logros.konami)) e.stopImmediatePropagation()
  })
}

const CANDADO = 'avalancha'

/** I1: una sola pestaña juega. `robar`: "Jugar acá" en la otra; la que lo pierde guarda una vez y queda quieta. */
export function tomarCandado(robar = false) {
  if (!navigator.locks) return // sin Web Locks (navegadores viejos): como antes
  navigator.locks
    .request(CANDADO, robar ? { steal: true } : { ifAvailable: true }, (l) => {
      if (!l) { juego.otraPestana = true; return }
      if (robar) location.reload() // carga lo último que guardó la otra
      return new Promise<void>(() => {}) // se tiene mientras viva la pestaña
    })
    .catch(() => { guardarYa(); juego.otraPestana = true }) // otra pestaña lo robó
}

/** Carga la partida y arranca el bucle. Llamar antes de montar la interfaz: Pila.svelte lee el estado al montarse. */
export function arrancar() {
  // Date.now y no el reloj del cuadro: sigue corriendo con la máquina suspendida y es el que queda en el guardado.
  let antes = Date.now()
  let acum = 0
  let p: ReturnType<typeof cargar> = null
  let calculo: { pasos: Generator<number, Ausencia>; real: number; ausente: boolean } | null = null
  let vuelta = 0 // ms de la última vuelta del bucle: la interfaz se actualiza como mucho cada uiMs()
  // Con un temporizador y no requestAnimationFrame: entre vuelta y vuelta el navegador no tiene que producir cuadros. Con la
  // pestaña oculta el navegador lo espacia solo (una vez por segundo o más): la economía sigue, a bajo ritmo, sin dibujar nada.
  let reloj: ReturnType<typeof setTimeout> | undefined
  const seguir = (ms = uiMs()) => { clearTimeout(reloj); reloj = setTimeout(cuadro, Math.max(0, ms)) }
  let topada = false // Capa 2: el aviso del tope sale al dejar el título (en el título no se ve)
  let cerrado = false // SPEC_CAPA1 §12: el primer salto tras cargar es tiempo con el juego cerrado (no una pestaña oculta)
  try { p = cargar(almacenLocal, Date.now()) } catch (e) { console.warn(e) } // sin almacenamiento: se juega sin guardar
  if (p === 'corrupto') juego.guardadoRoto = true
  else if (p) {
    juego.s = p.estado
    topada = !!p.tope
    // CORRECCIONES 4: un guardado de antes da por vistas las guías de lo que ya tiene (una sola vez).
    juego.vistos = p.vistos.guias ? p.vistos : yaVisto(p.estado, p.vistos)
    juego.record = p.record
    juego.logros = p.logros
    juego.zoom = p.zoom ?? 0
    juego.zoomMaxS = p.zoomMaxS ?? 0
    juego.beta = p.beta
    vigia.c = { ...contadoresVacios(), ...p.secretos }
    if (volviste(Date.now(), p.guardadoEn)) ganarSecreto('volviste')
    historial = p.historial ?? historialVacio(p.guardadoEn - p.estado.tiempoTotal * 1000)
    // Recién migrado de la Capa 0 (o se cerró antes de leer la presentación): entra por Cristalización.
    if (p.estado.infinitos > 0 && !p.vistos.cristales) juego.capa = 'cristalizacion'
    antes = p.guardadoEn // el primer cuadro simula lo que pasó desde el guardado
    cerrado = true
  }
  simuladoHasta = antes
  // Sin partida o sin tiempo jugado (recién borrada, o se recargó en el título): partida nueva, que arranca al entrar.
  const nueva = !p || p === 'corrupto' || p.estado.tiempoTotal === 0
  juego.hayPartida = !nueva
  if (!p || p === 'corrupto') juego.vistos = { guias: true } // partida nueva: nada que migrar
  if (p !== 'corrupto') juego.titulo = true
  previo = juego.ver = juego.s
  tomarCandado()
  escucharSecretos()
  setInterval(guardarYa, GUARDAR_CADA)
  addEventListener('pagehide', guardarYa)
  document.addEventListener('visibilitychange', () => document.hidden && guardarYa())

  const cuadro = () => {
    const ahora = Date.now()
    // En el título el reloj no avanza: lo de afuera se simula al entrar (una partida nueva arranca de ese momento).
    if (juego.titulo) {
      if (nueva) antes = simuladoHasta = ahora
      seguir()
      return
    }
    // (el aviso juntado del Infinito automático espera sus 30 s para no taparlo)
    if (topada) { topada = false; auto.desde = juego.s.tiempoTotal; juego.aviso = { id: avisos++, texto: txt.cristal.topada } }
    // La interfaz (todo lo que lee juego.s) se actualiza como mucho cada uiMs(): 10 veces por segundo, 4 con ahorro. La economía
    // avanza con pasos fijos, así que da lo mismo de a dos pasos que de a uno.
    if (!document.hidden && !calculo && ahora >= vuelta && ahora - vuelta < uiMs() - 4) return seguir(uiMs() - (ahora - vuelta))
    vuelta = ahora
    const real = Math.max(0, ahora - antes) / 1000
    acum += real * (juego.otraPestana ? 0 : juego.velocidad)
    antes = ahora
    let s = juego.s
    // Bloque 8: la pila de antes de estos pasos, por si en ellos llega un Infinito automático (una vez por segundo basta).
    if (ahora - fotoEn > 1000) (fotoActual = fotoPila()), (fotoEn = ahora)
    if (!calculo && acum > MAX_PASOS * PASO) {
      // Juego cerrado, app en segundo plano o máquina dormida: ausencia (tope, eficiencia, sin Infinitos). La pestaña abierta
      // que se atrasó no se castiga: corre todo con el tick normal.
      const ausente = cerrado || real > SIN_BUCLE_S
      calculo = { pasos: fueraDeLineaPasos(s, acum, ausente), real, ausente }
      acum = 0
    }
    if (calculo) {
      // C8: de a tramos de ~12 ms por cuadro, con la barra de Paneles.svelte; mientras tanto, nada más avanza ni se guarda nuevo.
      const hasta = performance.now() + 12
      let r = calculo.pasos.next()
      while (!r.done && performance.now() < hasta) r = calculo.pasos.next()
      if (!r.done) {
        juego.calculo = r.value
        seguir(0)
        return
      }
      const a = r.value
      // Contra el tiempo real (M11): a ×50 un tirón de 1,2 s no es una ausencia. En la Capa 0 no tapa la llegada al primer Infinito.
      if (calculo.ausente && calculo.real >= AVISAR_DESDE && (a.s !== s || a.defecto) && !(s.infinitos === 0 && enInfinito(a.s))) juego.ausencia = a
      juego.calculo = null
      calculo = null
      juego.saltos++
      s = a.s
    } else {
      const a = s
      for (; acum >= PASO; acum -= PASO) s = tick(s, PASO)
      transicion(a, s, juego.zoomMaxS).forEach(ganarSecreto)
    }
    // v1.0: un NaN o Infinity en la economía se anota y el juego sigue desde el último estado válido (no se traba).
    const malo = campoInvalido(s)
    if (malo) {
      if (malo !== ultimoMalo) console.error(`Avalancha: ${malo} no es finito; sigo con el último estado válido`)
      ultimoMalo = malo
      s = previo
    }
    cerrado = false
    // Contra el último estado que vio el bucle, no juego.s: comprimir a mano (botón, tecla C) lo reemplaza entre cuadros.
    registrar(historial, previo, s)
    // SPEC_CAPA1 §5: el Infinito a mano deja la reliquia esperando su tipo (el pop-up de Paneles.svelte, sin tiempo límite).
    s = conFoto(s, fotoActual)
    // Defecto superado (§8): su aviso; si no, el Infinito automático (Memoria nv4) tiene el mismo aviso que el botón.
    const nuevoDef = s.defectos.completos.length > previo.defectos.completos.length ? s.defectos.completos.at(-1)! : ''
    if (nuevoDef) vigia.defectoGanado(nuevoDef)
    if (nuevoDef) avisar('defectos', txt.cristal.defectos.ganado(txt.cristal.defectos.nombres[nuevoDef], txt.cristal.ganados(formato(s.cristalesTotales.sub(previo.cristalesTotales)))))
    else if (s.infinitos > previo.infinitos) avisoAutomatico(previo, s)
    if (s.infinitos > previo.infinitos && !s.relicario.pendiente) reliquiaAutomatica(s)
    previo = s
    if (Math.floor(s.tiempoTotal) !== Math.floor(juego.s.tiempoTotal)) juego.verHistorial++
    juego.s = s
    simuladoHasta = ahora
    revelar(s)
    revisarLogros(s)
    vigia.cuadro(ahora, s, !hayPanel(), new Date(ahora).getHours())
    medirEta(s)
    mirarStats(juego.s)
    if (s.infinitos === 0 && enInfinito(s) && !juego.cinematica && !hayPanel()) primerInfinito()
    if (finCapa1(s) && !juego.vistos.capa2 && !juego.cinematica && !hayCartel()) finDeCapa()
    seguir()
  }
  seguir()
}
