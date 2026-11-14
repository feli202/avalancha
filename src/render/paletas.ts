// Colores de la arena por altura de celda (0 a 3) y los cosméticos de los logros: paletas, efectos de avalancha y marcos.
// Son de diseño, no de balance. Los nombres van en es.cosmeticos.
import { CFG } from '../core/config'

/**
 * Colores de la arena por altura, distintos de los de la interfaz: el brillo va al revés de la frecuencia, así se leen
 * las formas del mandala. Ámbar (3 granos, ~59 % de las celdas) es arena al atardecer, sin luz propia; Coral, intermedio; Jade y sobre todo
 * Violeta (el más raro) brillan.
 */
export const COLORES_PILA = [0x3fe0b4, 0xc2a8ff, 0xa4574f, 0x8a5320]
/**
 * SPEC 6.8, paleta para daltonismo (tonos de Okabe-Ito): azul, bermellón, amarillo y rosa pálido, que además se
 * separan por brillo en el mismo orden que la normal (Ámbar oscuro, Violeta el más claro). Los de la interfaz, en index.html.
 */
export const COLORES_DALTONISMO = [0xf0e442, 0xf6c6e6, 0xd55e00, 0x1f5c99]

/** Paletas que dan los logros. Mismo orden de brillo que la normal (altura 3 la más oscura, 1 la más clara), salvo Negativo. */
export const PALETAS: Record<string, number[]> = {
  arena: COLORES_PILA,
  brasa: [0xffb02e, 0xfff0b0, 0xc8341c, 0x5a1408],
  aurora: [0x40ffb0, 0xd09cff, 0x2f7f9f, 0x1d2a5c],
  glaciar: [0x7fe3ff, 0xe8f8ff, 0x3a6fa8, 0x14304f],
  ceniza: [0xc8c8c8, 0xffffff, 0x6e6e72, 0x2e2e33],
  musgo: [0xb8e05a, 0xf0ffc0, 0x4f7a3a, 0x24391c],
  tinta: [0x6aa0ff, 0xf2e6c8, 0x34407a, 0x14182e],
  negativo: COLORES_PILA.map((c) => 0xffffff ^ c),
  oroViejo: [0xffd36b, 0xfff6d6, 0xb07a2a, 0x4a3210],
  // Logros secretos (CFG.secretos).
  papelViejo: [0xc9a46c, 0xf6ead0, 0x8f6c42, 0x3d2c1a],
  todoAmbar: [0xffb347, 0xffe0a0, 0xc97a22, 0x5c3610],
  simetria: [0x5fd3e6, 0xfaf4ff, 0xe65f9e, 0x26213d],
}

/** Efectos de avalancha: el índice es el u_efecto del shader (lienzo.ts). */
export const EFECTOS = ['normal', 'blanco', 'estela', 'chispas', 'cascada', 'relampago', 'mutante', 'arcoiris', 'oro',
  'rayo', 'lupa', 'arcoirisVivo', 'espejo', 'horizonte']

/** Marcos para la foto del mandala (marco.ts los dibuja). */
export const MARCOS = ['ninguno', 'fino', 'doble', 'anillos', 'orbitas', 'muescas', 'denso', 'rosa', 'infinito',
  'galleta', 'polaroid', 'arenaDorada', 'exponent']

/** Fondos detrás de la pila, en el orden de CFG.fondos (el primero, de inicio). lienzo.ts los dibuja en el shader. */
export const FONDOS = Object.keys(CFG.fondos)

export const css = (c: number) => `#${c.toString(16).padStart(6, '0')}`
