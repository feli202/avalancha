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
