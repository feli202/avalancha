// La mini pila de la escena de los Estratos (render/estratosVisual.ts): estable, simétrica y sin crear granos.
import { expect, test } from 'vitest'
import { N, soltar } from '../src/render/estratosVisual'

test('la mini pila queda estable, simétrica y conserva los granos mientras no llega al borde', () => {
  const h = new Uint16Array(N * N)
  soltar(h, 1000)
  expect(Math.max(...h)).toBeLessThan(4)
  expect(h.reduce((a, b) => a + b, 0)).toBe(1000)
  const c = N / 2
  for (let d = 1; d < 20; d++) expect([h[c * N + c + d], h[(c + d) * N + c], h[(c - d) * N + c]]).toEqual(Array(3).fill(h[c * N + c - d]))
})

test('llena, pierde granos por el sumidero y nunca escribe fuera de la grilla', () => {
  const h = new Uint16Array(N * N)
  soltar(h, 20000)
  expect(Math.max(...h)).toBeLessThan(4)
  expect(h.reduce((a, b) => a + b, 0)).toBeLessThan(8000)
  expect(h[0]).toBe(0)
})
