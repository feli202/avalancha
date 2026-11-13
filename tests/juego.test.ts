// El bucle del juego (src/ui/juego.svelte.ts), sin DOM.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { guardarYa, juego, partidaActual, reemplazarPartida, tomarCandado } from '../src/ui/juego.svelte'

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

describe('guardado que falla (I3)', () => {
  it('dos fallos seguidos prenden el aviso; uno bueno lo apaga', () => {
    const m = new Map<string, string>()
    let lleno = true
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, t: string) => { if (lleno) throw new Error('lleno'); m.set(k, t) } })
    expect(guardarYa()).toBe(false)
    expect(juego.sinGuardar).toBe(false)
    expect(guardarYa()).toBe(false)
    expect(juego.sinGuardar).toBe(true)
    lleno = false
    expect(guardarYa()).toBe(true)
    expect(juego.sinGuardar).toBe(false)
    vi.unstubAllGlobals()
  })

  it('importar o borrar sin poder escribir no recarga', () => {
    const reload = vi.fn()
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('lleno') } })
    vi.stubGlobal('location', { reload })
    expect(reemplazarPartida(partidaActual())).toBe(false)
    expect(reload).not.toHaveBeenCalled()
    expect(guardarYa()).toBe(false) // y el guardado normal sigue intentando (no quedó "reemplazando")
    vi.unstubAllGlobals()
  })
})
