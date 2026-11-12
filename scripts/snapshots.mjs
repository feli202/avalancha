// Fotos de la pila estable para que la pila de pantalla alcance a la real sin soltar grano por grano.
// Usa la misma Pila del worker. uso: node scripts/snapshots.mjs   (Node 23.6+: importa el .ts directo)
// Salida: src/assets/pilas.bin (gzip; por foto, un cuadrante de 257×257 bytes, desde el centro) y src/assets/pilas.json.
// Byte por celda: granos (0..3), o 4 = adentro de la pila con 0 granos (se derrumbó alguna vez).
import { writeFileSync, mkdirSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { LADO, LOTE, Pila } from '../src/render/pila.ts'

/** Al llenarse, la pila natural tiene lados planos (7 celdas cortos en los ejes); con un 12 % más de granos llena el círculo. */
const RELLENO = 1.12
const TAMANOS = [1_000, 3_000, 10_000, 30_000, 100_000, 300_000]
const C = LADO >> 1, Q = C + 1

const pila = new Pila()
let soltados = 0
const hasta = (n) => {
  while (soltados < n) {
    const k = Math.min(LOTE, n - soltados)
    pila.soltar(k)
    soltados += k
    pila.estabilizar()
  }
}
const adentro = new Uint8Array(LADO * LADO) // se derrumbó alguna vez
const foto = () => {
  for (const i of pila.tomarCeldas()) adentro[i] = 1
  const q = new Uint8Array(Q * Q)
  for (let y = 0; y < Q; y++)
    for (let x = 0; x < Q; x++) {
      const i = (C + y) * LADO + C + x, h = pila.h[i]
      q[y * Q + x] = h || (adentro[i] ? 4 : 0)
      // La pila es simétrica (abeliana, borde circular centrado): alcanza con un cuadrante.
      const e = (C - y) * LADO + C - x
      if (pila.h[e] !== h || pila.h[(C + y) * LADO + C - x] !== h) throw new Error('pila no simétrica')
    }
  return q
}

const fotos = [], granos = [], radio = []
for (const n of TAMANOS) {
  hasta(n)
  fotos.push(foto()); granos.push(n); radio.push(pila.radio)
}
// Capacidad: lo que entra hasta que el primer grano cae al sumidero.
while (!pila.perdidos) hasta(soltados + LOTE)
const capacidad = soltados
hasta(Math.round(capacidad * RELLENO))
fotos.push(foto()); granos.push(soltados); radio.push(pila.radio)

const bin = gzipSync(Buffer.concat(fotos), { level: 9 })
mkdirSync('src/assets', { recursive: true })
writeFileSync('src/assets/pilas.bin', bin)
writeFileSync('src/assets/pilas.json', JSON.stringify({ lado: Q, capacidad, granos, radio }) + '\n')
console.log({ capacidad, granos, radio: radio.map(Math.round), bytes: bin.length })
