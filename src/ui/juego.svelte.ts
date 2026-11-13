// Bucle del juego: lo único que conoce el tiempo real. La economía vive en src/core.
import { CFG, anillos, comprimir, estadoInicial, fueraDeLinea, mutacionesDisponibles, tick, type Ausencia, type State } from '../core'
import { almacenLocal } from '../guardado/almacen'
import { cargar, guardar, type Partida } from '../guardado/guardado'
import { historialVacio, registrar } from '../guardado/historial'
import type { Toma } from '../render/marcos'
import type { Medidas } from '../render/pilaVisual'
import { txt } from '../strings'
import { nuevosLogros, primerDerrumbe } from './logros'

const PASO = 0.05 // s: paso fijo de la economía (SPEC 8)
const MAX_PASOS = 200 // por cuadro; con más tiempo acumulado (pestaña oculta, carga) va la simulación fuera de línea
const GUARDAR_CADA = 10_000 // ms (SPEC 8)
const AVISAR_DESDE = 60 // s de ausencia para mostrar "Mientras no estabas"

class Juego {
  s = $state.raw(estadoInicial())
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
  /** Sube con cada salto fuera de línea: Pila.svelte no anima lo que pasó en la ausencia. */
  saltos = 0
}
export const juego = new Juego()

/** Historial para Estadísticas (corridas, avalanchas, Energía en el tiempo). Se muta en el lugar: ver juego.verHistorial. */
export let historial = historialVacio(Date.now())

/** Sismógrafo: derrumbes de cada avalancha de la pila visual que todavía no se dibujó. Sin $state: lo vacía un canvas. */
export const sismo: number[] = []

/** La pila del juego para la foto del mandala (la pone Pila.svelte). */
export const camara: { foto: (() => Toma) | null } = { foto: null }

const log10E = (s: State) => (s.energia.gt(1) ? s.energia.log10() : 0)

/**
 * Compresión: la meta y el progreso hacia ella en escala logarítmica, del umbral anterior (0 para la primera).
 * Después de la última Compresión la meta es el Infinito (`final`).
 */
export function progresoCompresion(s: State) {
  const u = CFG.compresion.umbrales_log10
  const final = s.compresiones >= u.length
  const meta = final ? CFG.infinito_log10 : u[s.compresiones]
  const desde = u[s.compresiones - 1] ?? 0
  return { meta, final, p: Math.min(1, Math.max(0, (log10E(s) - desde) / (meta - desde))) }
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
  for (const [k, n] of Object.entries(CFG.autocompradores)) c[`auto_${k}`] = s.compresiones >= n
  return c
}

/** Nombre de lo que compra cada autocomprador (claves de CFG.autocompradores). */
export const nombreAuto = (k: string) => (k === 'caudal' ? txt.caudal : txt.colores[CFG.colores.findIndex((c) => c.id === k)])

let avisos = 0
const AVISOS_JUNTOS = 2
function revelar(s: State) {
  const c = condiciones(s)
  const nuevos = Object.keys(c).filter((k) => c[k] && !juego.vistos[k])
  if (!nuevos.length) return
  juego.vistos = { ...juego.vistos, ...Object.fromEntries(nuevos.map((k) => [k, true])) }
  // Los autocompradores que llegan juntos van en una sola frase; si aparecen muchas cosas juntas (saltos de debug), las últimas dos.
  const autos = nuevos.filter((k) => k.startsWith('auto_') && !(k in txt.revelado)).map((k) => nombreAuto(k.slice(5)))
  const frases = nuevos.filter((k) => k in txt.revelado).map((k) => txt.revelado[k])
  if (autos.length) frases.push(txt.autocompradores(autos))
  // Un indicador por sistema; los autocompradores que llegan juntos, uno solo (el primero).
  const conGuia = nuevos.filter((k) => k in txt.guia.indicador || k.startsWith('auto_'))
  const primerAuto = conGuia.find((k) => k.startsWith('auto_') && !(k in txt.guia.indicador))
  const guias = conGuia.filter((k) => k in txt.guia.indicador || k === primerAuto)
  if (guias.length) juego.guias = [...juego.guias, ...guias].slice(-AVISOS_JUNTOS)
  juego.aviso = { id: avisos++, texto: frases.slice(-AVISOS_JUNTOS).join(' ') }
}

let logrosAvisados = 0
function revisarLogros(s: State) {
  const nuevos = nuevosLogros(s, juego.record, juego.logros)
  if (!nuevos.length) return
  juego.logros = { ...juego.logros, ...Object.fromEntries(nuevos.map((k) => [k, true])) }
  juego.logro = { id: logrosAvisados++, claves: nuevos }
}

/** El último estado que vio el bucle (el historial compara contra este). */
let previo = juego.s

/** Comprimir a mano (botón, tecla C): se anota en el historial con la Energía exacta de ese momento. */
export function comprimirYa() {
  const antes = juego.s
  juego.s = comprimir(antes)
  registrar(historial, antes, juego.s)
  previo = juego.s
}

/** La pista "Tocá la pila": hasta el primer Puñado (las partidas de antes no lo anotaban: con la tienda ya visible, tampoco). */
export const invitaTocar = () => !juego.vistos.punado && !juego.vistos.tienda

/** Hay un cartel o panel encima: las teclas del juego (Espacio, M, C) no hacen nada. */
export const hayPanel = (): boolean => juego.titulo || juego.panel !== null || juego.ausencia !== null || juego.guardadoRoto || juego.otraPestana

/** Reloj real (ms) hasta el que llegó la simulación. El guardado lleva esta fecha y no Date.now(): con la pestaña oculta
 * no hay cuadros, juego.s queda quieto y el guardado tiene que seguir diciendo de cuándo es (si no, se pierde la ausencia). */
let simuladoHasta = Date.now()

export const partidaActual = (): Partida =>
  ({ estado: juego.s, guardadoEn: simuladoHasta, vistos: juego.vistos, record: juego.record, logros: juego.logros, historial })

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
export function reemplazarPartida(p: Partida) {
  try { guardar(almacenLocal, p) } catch (e) { console.warn(e); return false }
  reemplazando = true // que el pagehide no la pise con la de ahora
  location.reload()
  return true
}

export const borrarPartida = () =>
  reemplazarPartida({ estado: estadoInicial(), guardadoEn: Date.now(), vistos: {}, record: 0, logros: {}, historial: historialVacio(Date.now()) })

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
  try { p = cargar(almacenLocal, Date.now()) } catch (e) { console.warn(e) } // sin almacenamiento: se juega sin guardar
  if (p === 'corrupto') juego.guardadoRoto = true
  else if (p) {
    juego.s = p.estado
    juego.vistos = p.vistos
    juego.record = p.record
    juego.logros = p.logros
    historial = p.historial ?? historialVacio(p.guardadoEn - p.estado.tiempoTotal * 1000)
    antes = p.guardadoEn // el primer cuadro simula lo que pasó desde el guardado
  }
  simuladoHasta = antes
  // Sin partida o sin tiempo jugado (recién borrada, o se recargó en el título): partida nueva, que arranca al entrar.
  const nueva = !p || p === 'corrupto' || p.estado.tiempoTotal === 0
  juego.hayPartida = !nueva
  if (p !== 'corrupto') juego.titulo = true
  previo = juego.s
  tomarCandado()
  setInterval(guardarYa, GUARDAR_CADA)
  addEventListener('pagehide', guardarYa)
  document.addEventListener('visibilitychange', () => document.hidden && guardarYa())

  const cuadro = () => {
    const ahora = Date.now()
    // En el título el reloj no avanza: lo de afuera se simula al entrar (una partida nueva arranca de ese momento).
    if (juego.titulo) {
      if (nueva) antes = simuladoHasta = ahora
      requestAnimationFrame(cuadro)
      return
    }
    acum += (Math.max(0, ahora - antes) / 1000) * (juego.otraPestana ? 0 : juego.velocidad)
    antes = ahora
    let s = juego.s
    if (acum > MAX_PASOS * PASO) {
      const a = fueraDeLinea(s, acum)
      if (a.segundos >= AVISAR_DESDE && s.infinitos === 0 && a.s.infinitos === 0) juego.ausencia = a
      juego.saltos++
      s = a.s
      acum = 0
    } else for (; acum >= PASO; acum -= PASO) s = tick(s, PASO)
    // Contra el último estado que vio el bucle, no juego.s: comprimir a mano (botón, tecla C) lo reemplaza entre cuadros.
    registrar(historial, previo, s)
    previo = s
    if (Math.floor(s.tiempoTotal) !== Math.floor(juego.s.tiempoTotal)) juego.verHistorial++
    juego.s = s
    simuladoHasta = ahora
    revelar(s)
    revisarLogros(s)
    medirEta(s)
    requestAnimationFrame(cuadro)
  }
  requestAnimationFrame(cuadro)
}
