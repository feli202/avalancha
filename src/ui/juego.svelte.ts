// Bucle del juego: lo único que conoce el tiempo real. La economía vive en src/core.
import { CFG, anillos, estadoInicial, tick, type State } from '../core'
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
}
export const juego = new Juego()

/** Sismógrafo: derrumbes de cada avalancha de la pila visual que todavía no se dibujó. Sin $state: lo vacía un canvas. */
export const sismo: number[] = []

/** Compresión: la meta y el progreso hacia ella en escala logarítmica, del umbral anterior (0 para la primera). */
export function progresoCompresion(s: State) {
  const u = CFG.compresion.umbrales_log10
  const meta = u[s.compresiones] as number | undefined
  if (meta === undefined) return { meta, p: 0 }
  const desde = u[s.compresiones - 1] ?? 0
  const e = s.energia.gt(1) ? s.energia.log10() : 0
  return { meta, p: Math.min(1, Math.max(0, (e - desde) / (meta - desde))) }
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
  }
  for (let i = 1; i < CFG.colores.length; i++) c[`color${i}`] = s.coloresDesbloqueados > i
  return c
}

let avisos = 0
function revelar(s: State) {
  let nuevo: string | null = null
  for (const [k, si] of Object.entries(condiciones(s))) if (si && !juego.vistos[k]) nuevo = k
  if (!nuevo) return
  juego.vistos = { ...juego.vistos, ...Object.fromEntries(Object.entries(condiciones(s)).filter(([, si]) => si)) }
  // Si aparecen varias juntas (saltos de debug) se muestra la última frase.
  juego.aviso = { id: avisos++, texto: es.revelado[nuevo] }
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
    requestAnimationFrame(cuadro)
  }
  requestAnimationFrame(cuadro)
}
