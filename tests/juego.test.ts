// El bucle del juego (src/ui/juego.svelte.ts), sin DOM.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { partidaActual } from '../src/ui/juego.svelte'

afterEach(() => vi.useRealTimers())

describe('guardado del bucle', () => {
  it('B1: dos guardados sin cuadro en el medio llevan la misma fecha (la del estado, no la de ahora)', () => {
    vi.useFakeTimers()
    const a = partidaActual().guardadoEn
    vi.setSystemTime(Date.now() + 10 * 60_000) // pestaña oculta 10 min: no hubo cuadros
    expect(partidaActual().guardadoEn).toBe(a)
  })
})
