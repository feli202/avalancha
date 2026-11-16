// El embudo de los Estratos (render/embudo.ts): arena que cae de verdad, sin crear ni perder granos por el camino.
import { expect, test } from 'vitest'
import { ALTO, ANCHO, BANDAS, Embudo, banda, capacidad } from '../src/render/embudo'

const total = (e: Embudo) => e.celdas.reduce((s, v) => s + (v ? 1 : 0), 0)

test('con los poros cerrados, la arena se asienta en la bandeja sin perderse ni meterse en las paredes', () => {
  const e = new Embudo(() => 0.3)
  e.abrir(3)
  e.objetivo = [1, 1, 1, 0, 0, 0, 0, 0]
  e.echar(4, () => 2)
  let n = total(e)
  for (let p = 0; p < 400; p++) { if (p < 20) { e.echar(2, () => p % 4); n = total(e) } e.paso() }
  expect(total(e)).toBe(n)
  for (let i = 0; i < ANCHO * ALTO; i++) if (e.celdas[i]) expect(e.muro[i]).toBe(0)
  // quieta: nada flota (cada grano tiene algo debajo)
  for (let i = 0; i < ANCHO * (ALTO - 1); i++) if (e.celdas[i]) expect(e.celdas[i + ANCHO] || e.muro[i + ANCHO]).toBeTruthy()
  expect(e.cuentas[0]).toBe(n)
})

test('pasado su nivel, la bandeja gotea a la de abajo y los colores se mezclan', () => {
  const e = new Embudo()
  e.abrir(2)
  e.objetivo = [0.3, 0.9, 0, 0, 0, 0, 0, 0]
  e.llenar(0, Math.round(0.6 * capacidad(0)), () => 0)
  for (let p = 0; p < 600; p++) e.paso()
  expect(e.cuentas[0]).toBeLessThanOrEqual(Math.ceil(0.3 * capacidad(0)) + 2)
  expect(e.cuentas[1]).toBeGreaterThan(100)
})

test('lo que cae sobre un estrato cerrado se pierde en la roca', () => {
  const e = new Embudo()
  e.abrir(1)
  e.objetivo = [0, 0, 0, 0, 0, 0, 0, 0]
  e.llenar(0, 300, () => 1)
  let perdidos = 0
  for (let p = 0; p < 600; p++) perdidos += e.paso()
  expect(perdidos + total(e)).toBe(300)
  expect(perdidos).toBeGreaterThan(0)
  expect(BANDAS).toBe(8)
  expect(banda(7).b - banda(7).a).toBeGreaterThan(40)
})
