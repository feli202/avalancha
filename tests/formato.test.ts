// Hito 5b: notación científica y de ingeniería (SPEC 8).
import { describe, expect, it, vi } from 'vitest'

const ajustes = vi.hoisted(() => ({ notacion: 'cientifica' }))
vi.mock('../src/ui/ajustes.svelte', () => ({ ajustes }))
const { formato, hablado } = await import('../src/ui/formato')

describe('formato', () => {
  it('científica', () => {
    ajustes.notacion = 'cientifica'
    expect(formato(999_999)).toBe('999.999')
    expect(formato(1.234e45)).toBe('1,23e45')
    expect(formato(9.999e45)).toBe('1,00e46')
  })
  it('ingeniería: exponente múltiplo de 3', () => {
    ajustes.notacion = 'ingenieria'
    expect(formato(999_999)).toBe('999.999')
    expect(formato(1.234e6)).toBe('1,23e6')
    expect(formato(1.234e7)).toBe('12,34e6')
    expect(formato(1.234e47)).toBe('123,40e45')
    expect(formato(9.99999e47)).toBe('1,00e48')
  })
})

describe('hablado', () => {
  it('lee la notación científica para lectores de pantalla', () => {
    expect(hablado('1,23e45')).toBe('1,23 por diez a la 45')
    expect(hablado('12.345')).toBe('12.345')
  })
})

describe('M4', async () => {
  const { formato } = await import('../src/ui/formato')
  const Decimal = (await import('break_infinity.js')).default
  const { CFG, estadoInicial, puedeComprimir } = await import('../src/core')
  it('los costos se redondean para arriba', () => expect([formato(47.1), formato(47.3, true)]).toEqual(['47', '48']))
  it('comprimir: con la Energía apenas por debajo del umbral, no', () => {
    const u = CFG.compresion.umbrales_log10[0]
    expect(puedeComprimir({ ...estadoInicial(), energia: Decimal.pow10(u).mul(1 - 1e-12) })).toBe(false)
    expect(puedeComprimir({ ...estadoInicial(), energia: Decimal.pow10(u) })).toBe(true)
  })
})
