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

describe('v1.0, bloque 4: todas las notaciones', async () => {
  const { formato, NOTACIONES } = await import('../src/ui/formato')
  const Decimal = (await import('break_infinity.js')).default
  const casos = [0, 7, 1234, 1.5e6, 1e308, new Decimal('1e1000'), NaN]
  it.each(NOTACIONES)('%s: anda con 0, chicos, 1e308, 1e1000 y NaN (devuelve texto)', (n) => {
    for (const x of casos) expect(typeof formato(x, false, n)).toBe('string')
    expect(formato(NaN, false, n)).toBe('—')
  })
  const f = (x: number | InstanceType<typeof Decimal>, n: Parameters<typeof formato>[2]) => formato(x, false, n)
  it('científica, ingeniería, logarítmica y mixta', () => {
    expect(f(1.23e308, 'cientifica')).toBe('1,23e308')
    expect(f(1.234e308, 'ingenieria')).toBe('123,40e306')
    expect(f(1.23e308, 'logaritmica')).toBe('e308,09')
    expect(f(new Decimal('1e1000'), 'cientifica')).toBe('1,00e1000')
    expect(f(1.5e30, 'mixta')).toBe('1,50No')
    expect(f(1.5e33, 'mixta')).toBe('1,50e33')
  })
  it('letras: K, M… Dc y después aa, ab…', () => {
    expect(f(999, 'letras')).toBe('999')
    expect(f(1234, 'letras')).toBe('1,23K')
    expect(f(12.3e6, 'letras')).toBe('12,3M')
    expect(f(1e33, 'letras')).toBe('1,00Dc')
    expect(f(1e36, 'letras')).toBe('1,00aa')
    expect(f(1e39, 'letras')).toBe('1,00ab')
    expect(f(999.99e3, 'letras')).toBe('1,00M')
  })
  it('en palabras', () => {
    expect(f(2.5e6, 'palabras')).toBe('2,50 millones')
    expect(f(1e12, 'palabras')).toBe('1,00 billón')
    expect(f(3e9, 'palabras')).toBe('3,00 mil millones')
    expect(f(1e308, 'palabras')).toBe('1,00e308') // más allá de los nombres
  })
  it('pila: el exponente en base 4 con los cuadraditos (308 = 10310)', () => {
    expect(f(1e308, 'pila')).toBe('1,00e🟪🟩🟧🟪🟩')
  })
  it('arena de la Tierra', () => {
    expect(f(7.5e18 * 1.3e289, 'arena')).toBe('×1,30e289 Tierras de arena')
    expect(f(0, 'arena')).toBe('×0 Tierras de arena')
  })
  it('romanos, con sobrerrayado para los miles', () => {
    expect(f(0, 'romanos')).toBe('N')
    expect(f(1987, 'romanos')).toBe('MCMLXXXVII')
    expect(f(12345, 'romanos')).toBe('X̅I̅I̅CCCXLV')
    expect(f(1e308, 'romanos')).toBe('demasiado para Roma')
  })
  it('binario', () => {
    expect(f(5, 'binario')).toBe('101')
    expect(f(2 ** 60, 'binario')).toBe('1,0000×2^111100')
  })
  it('una banda y ciego', () => {
    expect(f(0, 'banda')).toBe('nada')
    expect(f(5, 'banda')).toBe('poquito')
    expect(f(1e50, 'banda')).toBe('una banda')
    expect(f(new Decimal('1e400'), 'banda')).toBe('infinito y más allá')
    expect(f(1e100, 'ciego')).toBe('···')
  })
})
