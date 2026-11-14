import type { PilaVisual } from '../render/pilaVisual'

/** Modo grabación (solo desarrollo, clips.ts): mientras `cuadro` está puesto, maneja la pila en lugar de Pila.svelte. */
export const grabacion: { pila: PilaVisual | null; cuadro: ((ms: number) => void) | null } = { pila: null, cuadro: null }
