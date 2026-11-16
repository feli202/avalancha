// Bloque 8: la cara de cada reliquia es la pila del Infinito en que nació, guardada chica. Puro (sin DOM): lo usan
// el bucle del juego (al hacer Infinito) y el generador de miniaturas (miniPilas.ts).
import { LADO } from './pila'

const C = LADO >> 1
/** Lado de la instantánea en celdas; 2 bits por celda = 256 bytes. */
const FOTO_LADO = 32, FR = FOTO_LADO >> 1
/** La instantánea de la pila (alturas de LADO×LADO y su radio) en 32×32 celdas de 2 bits, en base64. Se muestrea
 * el círculo de la pila entera: una pila chica se agranda y una grande se lee de a saltos (se ve el dibujo grande). */
export function instantanea(alturas: Uint8Array, radio: number): string {
  const k = (2 * Math.max(radio, 1) + 3) / FOTO_LADO
  const b = new Uint8Array((FOTO_LADO * FOTO_LADO) / 4)
  for (let y = 0; y < FOTO_LADO; y++)
    for (let x = 0; x < FOTO_LADO; x++) {
      const px = C + Math.floor((x - FR + 0.5) * k), py = C + Math.floor((y - FR + 0.5) * k), i = y * FOTO_LADO + x
      b[i >> 2] |= (alturas[py * LADO + px] & 3) << ((i & 3) * 2)
    }
  return btoa(String.fromCharCode(...b))
}
/** La instantánea como pila de LADO×LADO (32×32 celdas en el centro, recortadas en círculo) para el Lienzo. */
export function desdeFoto(foto: string) {
  const b = Uint8Array.from(atob(foto), (c) => c.charCodeAt(0))
  const alturas = new Uint8Array(LADO * LADO), dentro = new Uint8Array(LADO * LADO)
  for (let y = 0; y < FOTO_LADO; y++)
    for (let x = 0; x < FOTO_LADO; x++) {
      if ((x - FR + 0.5) ** 2 + (y - FR + 0.5) ** 2 > FR * FR) continue
      const i = y * FOTO_LADO + x, j = (C - FR + y) * LADO + C - FR + x
      dentro[j] = 1
      alturas[j] = (b[i >> 2] >> ((i & 3) * 2)) & 3
    }
  return { alturas, dentro, radio: FR }
}

