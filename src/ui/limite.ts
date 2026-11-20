// CORRECCIONES 2: los límites del sonido, sin Web Audio (sonido.ts los usa; así se pueden testear).

/** Deja pasar un sonido si hay menos de `max` sonando y ese mismo no sonó hace menos de `repetirMs`. El que no pasa se descarta. */
export function crearLimite(max: number, repetirMs: number) {
  const ultimo: Record<string, number> = {}
  let fines: number[] = [] // ms en que termina cada sonido que está sonando
  return (nombre: string, ahora: number, duraMs: number) => {
    fines = fines.filter((f) => f > ahora)
    if (fines.length >= max || ahora - (ultimo[nombre] ?? -Infinity) < repetirMs) return false
    ultimo[nombre] = ahora
    fines.push(ahora + duraMs)
    return true
  }
}

/** Volumen (0–1) de cada sonido de una seguidilla: los primeros `libres` enteros; después baja para que el total no crezca. */
export function crearAtenuador(libres: number, olvidoMs: number) {
  let seguidos = 0, antes = 0
  return (ahora: number) => {
    seguidos = seguidos * Math.exp(-(ahora - antes) / olvidoMs) + 1
    antes = ahora
    return Math.min(1, libres / seguidos)
  }
}

/** v1.0, bloque 1: muestra un valor a lo sumo cada `ms`, pero el último siempre llega (con un temporizador). Antes se
 * descartaba: en 1e308 la economía se congela (el estado deja de cambiar) y la vista quedaba para siempre en 99 %, con el
 * botón de Infinito o de Cascada sin actualizar hasta recargar. */
export function crearRefresco<T>(ms: number, mostrar: (v: T) => void, ahora = () => performance.now(),
  programar: (f: () => void, t: number) => unknown = setTimeout, cancelar: (h: any) => void = clearTimeout) {
  let visto = -Infinity
  let pendiente: unknown
  return (v: T, limitar: boolean) => {
    cancelar(pendiente)
    const falta = ms - (ahora() - visto)
    const ya = () => { visto = ahora(); mostrar(v) }
    if (limitar && falta > 0) pendiente = programar(ya, falta)
    else ya()
  }
}
