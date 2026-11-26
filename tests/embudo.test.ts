// El embudo de los Estratos (render/embudo.ts): arena que cae de verdad, sin crear ni perder granos por el camino.
import { expect, test } from 'vitest'
import { ALTO, ANCHO, BANDAS, Embudo, FONDO, VIDRIO, banda, capacidad } from '../src/render/embudo'

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

test('Capa 2: con el Horno encendido la arena que llega al fondo se derrite en vidrio que se junta abajo, sin llenarlo', () => {
  const e = new Embudo()
  e.abrir(BANDAS)
  e.objetivo = Array(BANDAS).fill(0.95)
  for (let k = 0; k < BANDAS; k++) e.llenar(k, Math.round(0.95 * capacidad(k)), () => k % 4)
  e.horno = true
  const f = banda(FONDO)
  const vidrio = () => { let n = 0; for (let y = f.y; y < f.piso; y++) for (let x = f.a; x <= f.b; x++) n += +(e.celdas[y * ANCHO + x] === VIDRIO); return n }
  let max = 0
  for (let p = 0; p < 3000; p++) { e.echar(3, () => p % 4); e.paso(); max = Math.max(max, vidrio()) }
  expect(vidrio()).toBeGreaterThan(20)
  expect(max).toBeLessThan(capacidad(FONDO) * 0.6)
  // apagado (la Capa 1): lo que cae al fondo desaparece, como siempre
  e.horno = false
  for (let y = f.y; y < f.piso; y++) e.celdas.fill(0, y * ANCHO + f.a, y * ANCHO + f.b + 1)
  for (let p = 0; p < 300; p++) { e.echar(3, () => 0); e.paso() }
  expect(vidrio()).toBe(0)
})
