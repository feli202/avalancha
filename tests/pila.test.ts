// SPEC 9, hito 2: con G = 10.000 la pila visual coincide con la de referencia (balance/pila.c, modo bulk).
import { expect, test } from 'vitest'
import { LADO, LOTE, Pila } from '../src/render/pila'

/** Port literal de `pila bulk N` (pila LIFO, todos los granos de una, grilla sin borde alcanzable). */
function referencia(N: number) {
  const S = 301, c = ((S / 2) | 0) * S + ((S / 2) | 0)
  const h = new Float64Array(S * S), stk = new Int32Array(S * S * 2), inq = new Uint8Array(S * S)
  let T = 0, sp = 0
  h[c] = N; stk[sp++] = c; inq[c] = 1
  while (sp) {
    const i = stk[--sp]; inq[i] = 0
    const k = Math.floor(h[i] / 4); if (!k) continue
    h[i] -= 4 * k; T += k
    for (const n of [i + 1, i - 1, i + S, i - S]) { h[n] += k; if (h[n] >= 4 && !inq[n]) { inq[n] = 1; stk[sp++] = n } }
  }
  return { T, ...medir(h, S) }
}

/** Radio e histograma de alturas, igual que el final de pila.c. */
function medir(h: ArrayLike<number>, S: number) {
  const cnt = [0, 0, 0, 0], x0 = (S / 2) | 0
  let r = 0
  const d = (i: number) => Math.hypot((i % S) - x0, ((i / S) | 0) - x0)
  for (let i = 0; i < S * S; i++) if (h[i]) { cnt[h[i]]++; r = Math.max(r, d(i)) }
  for (let i = 0; i < S * S; i++) if (!h[i] && d(i) < r) cnt[0]++
  return { r, cnt }
}

test('G = 10.000: radio, derrumbes y alturas iguales a pila.c bulk', () => {
  const N = 10000
  const pila = new Pila()
  // Lotes desparejos, como los cuadros del juego: por ser abeliana el resultado no depende del reparto.
  for (let g = 0, n = 1; g < N; g += n, n = Math.min(N - g, (n * 7 + 3) % LOTE || 1)) {
    pila.soltar(n)
    while (!pila.estable) pila.estabilizar(1000) // en tandas, como el worker
  }
  const ref = referencia(N)
  const vis = { T: pila.derrumbes, ...medir(pila.h, LADO) }
  console.log(`visual  N ${N} T ${vis.T} r ${vis.r.toFixed(1)} h0 ${vis.cnt[0]} h1 ${vis.cnt[1]} h2 ${vis.cnt[2]} h3 ${vis.cnt[3]}`)
  console.log(`pila.c  N ${N} T ${ref.T} r ${ref.r.toFixed(1)} h0 ${ref.cnt[0]} h1 ${ref.cnt[1]} h2 ${ref.cnt[2]} h3 ${ref.cnt[3]}`)
  expect(vis).toEqual(ref)
  expect(pila.perdidos).toBe(0)
  expect(pila.h.reduce((a, b) => a + b, 0)).toBe(N)
  expect(pila.tomarCeldas().length).toBeGreaterThan(0)
  expect(Math.abs(pila.radio - ref.r)).toBeLessThanOrEqual(1.5)
})

test('sumidero circular: una pila llena pierde granos fuera del círculo, queda estable y ningún byte se desborda', () => {
  const pila = new Pila()
  pila.h.fill(3) // todo al límite: el lote siguiente dispara la avalancha más grande posible
  pila.soltar(LOTE)
  const d = pila.estabilizar()
  const suma = pila.h.reduce((a, b) => a + b, 0)
  const c = LADO >> 1
  console.log(`pila llena + ${LOTE} granos: ${d} derrumbes, ${pila.perdidos} granos al sumidero`)
  expect(pila.estable).toBe(true)
  expect(pila.h.every((v) => v <= 3)).toBe(true)
  expect(pila.h[c * LADO]).toBe(0) // (0, c): sumidero, toca el círculo
  expect(pila.h[0]).toBe(3) // la esquina queda fuera de todo: nunca le llega un grano
  // Conservación: si una celda hubiera pasado de 255 se habrían perdido granos sin contar.
  expect(suma + pila.perdidos).toBe(3 * LADO * LADO + LOTE)
}, 30_000) // la avalancha más grande posible: ~140 millones de derrumbes
