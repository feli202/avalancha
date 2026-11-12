// Bucle del juego: lo único que conoce el tiempo real. La economía vive en src/core.
import { CFG, anillos, estadoInicial, mutacionesDisponibles, tick, type State } from '../core'
import type { Medidas } from '../render/pilaVisual'
import { es } from '../strings/es'

const PASO = 0.05 // s: paso fijo de la economía (SPEC 8)
const MAX_PASOS = 200 // por cuadro

class Juego {
  s = $state.raw(estadoInicial())
  velocidad = $state(1)
  /** Debug: nivel simulado de todos los colores para ver el brillo de la pila (0 = el real). */
  nivelColores = $state(0)
  /** Rendimiento de la pila visual, una vez por segundo (panel de debug). */
  medidas = $state.raw<Medidas | null>(null)
  /** SPEC 6.8: arranca como pida el sistema. shortcut: no se guarda; el hito 5 la pasa a los ajustes. */
  reducirDestellos = $state(matchMedia('(prefers-reduced-motion: reduce)').matches)
  /** Etiqueta de escala de la pila (la escribe Pila.svelte). */
  escalaK = $state(0)
  /** SPEC 5: partes de la interfaz que ya aparecieron. Nunca se esconden. shortcut: no se guarda; va al guardado del hito 5. */
  vistos = $state.raw<Record<string, boolean>>({})
  /** Radio de la pila en px CSS (lo escribe Pila.svelte; el anillo de Compresión lo rodea). */
  radioPila = $state(0)
  /** La frase de la última aparición. */
  aviso = $state.raw<{ id: number; texto: string } | null>(null)
  /** Segundos de juego estimados hasta la meta de Compresión (null si no hay ritmo para medir). */
  eta = $state<number | null>(null)
  /** La avalancha más grande de la pila visual, en derrumbes. shortcut: no se guarda; va al guardado del hito 5. */
  record = $state(0)
}
export const juego = new Juego()

/** Sismógrafo: derrumbes de cada avalancha de la pila visual que todavía no se dibujó. Sin $state: lo vacía un canvas. */
export const sismo: number[] = []

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
    derrumbes: s.granos >= 4 || s.compresiones > 0, // todos los granos caen al centro: el 4.º hace el primer derrumbe
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
export const nombreAuto = (k: string) => (k === 'caudal' ? es.caudal : es.colores[CFG.colores.findIndex((c) => c.id === k)])

let avisos = 0
const AVISOS_JUNTOS = 2
function revelar(s: State) {
  const c = condiciones(s)
  const nuevos = Object.keys(c).filter((k) => c[k] && !juego.vistos[k])
  if (!nuevos.length) return
  juego.vistos = { ...juego.vistos, ...Object.fromEntries(nuevos.map((k) => [k, true])) }
  // Los autocompradores que llegan juntos van en una sola frase; si aparecen muchas cosas juntas (saltos de debug), las últimas dos.
  const autos = nuevos.filter((k) => k.startsWith('auto_') && !(k in es.revelado)).map((k) => nombreAuto(k.slice(5)))
  const frases = nuevos.filter((k) => k in es.revelado).map((k) => es.revelado[k])
  if (autos.length) frases.push(es.autocompradores(autos))
  juego.aviso = { id: avisos++, texto: frases.slice(-AVISOS_JUNTOS).join(' ') }
}

export function arrancar() {
  let antes = performance.now()
  let acum = 0
  const cuadro = (ahora: number) => {
    acum += ((ahora - antes) / 1000) * juego.velocidad
    antes = ahora
    let s = juego.s
    for (let i = 0; acum >= PASO && i < MAX_PASOS; i++, acum -= PASO) s = tick(s, PASO)
    // shortcut: el tiempo que sobra (pestaña oculta) va en un solo paso largo; el hito 5 lo cambia por la simulación fuera de línea
    if (acum >= PASO) { s = tick(s, acum); acum = 0 }
    juego.s = s
    revelar(s)
    medirEta(s)
    requestAnimationFrame(cuadro)
  }
  requestAnimationFrame(cuadro)
}
