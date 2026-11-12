// Bucle del juego: lo único que conoce el tiempo real. La economía vive en src/core.
import { estadoInicial, tick } from '../core'
import type { Medidas } from '../render/pilaVisual'

const PASO = 0.05 // s: paso fijo de la economía (SPEC 8)
const MAX_PASOS = 200 // por cuadro

class Juego {
  s = $state.raw(estadoInicial())
  velocidad = $state(1)
  /** Debug: nivel simulado de todos los colores para ver el brillo de la pila (0 = el real). */
  nivelColores = $state(0)
  /** Rendimiento de la pila visual, una vez por segundo (panel de debug). */
  medidas = $state.raw<Medidas | null>(null)
}
export const juego = new Juego()

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
    requestAnimationFrame(cuadro)
  }
  requestAnimationFrame(cuadro)
}
