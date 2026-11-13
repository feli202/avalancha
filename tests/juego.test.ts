// El bucle del juego (src/ui/juego.svelte.ts), sin DOM.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { guardarYa, juego, partidaActual, tomarCandado } from '../src/ui/juego.svelte'

afterEach(() => vi.useRealTimers())

describe('guardado del bucle', () => {
  it('B1: dos guardados sin cuadro en el medio llevan la misma fecha (la del estado, no la de ahora)', () => {
    vi.useFakeTimers()
    const a = partidaActual().guardadoEn
    vi.setSystemTime(Date.now() + 10 * 60_000) // pestaña oculta 10 min: no hubo cuadros
    expect(partidaActual().guardadoEn).toBe(a)
  })
})

describe('dos pestañas (I1)', () => {
  it('si otra pestaña tiene el candado, esta no guarda', async () => {
    vi.stubGlobal('navigator', { locks: { request: async (_n: string, _o: unknown, f: (l: null) => unknown) => f(null) } })
    tomarCandado()
    await Promise.resolve()
    expect(juego.otraPestana).toBe(true)
    expect(guardarYa()).toBe(false)
    juego.otraPestana = false
    vi.unstubAllGlobals()
  })
})
