// El bucle del juego (src/ui/juego.svelte.ts), sin DOM.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CFG, INFINITO, estadoInicial, infinito } from '../src/core'
import { guardarYa, juego, partidaActual, reemplazarPartida, revelar, tomarCandado, yaVisto } from '../src/ui/juego.svelte'

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

describe('guías: una sola vez en la vida de la partida (CORRECCIONES 4)', () => {
  const en = (compresiones: number) => ({ ...estadoInicial(), compresiones })
  const A = CFG.autocompradores

  it('la guía de los autocompradores sale con el primero y no vuelve con los siguientes ni después de un Infinito', () => {
    juego.vistos = { guias: true }
    juego.guias = []
    revelar(en(A.caudal))
    expect(juego.guias).toContain('auto_caudal')
    expect(juego.vistos.auto).toBe(true)
    juego.guias = []
    revelar(en(A.violeta)) // más autocompradores: su frase sí, la guía no
    expect(juego.vistos.auto_violeta).toBe(true)
    expect(juego.guias.some((k) => k !== 'cascada' && k !== 'mutaciones' && k !== 'auto_compresion_auto')).toBe(false)
    // Infinito: la corrida arranca de cero y todo se vuelve a desbloquear. Nada de lo visto se vuelve a mostrar.
    const vistos = (juego.vistos = yaVisto(en(CFG.compresion.umbrales_log10.length), juego.vistos))
    juego.guias = []
    const nueva = infinito({ ...en(CFG.compresion.umbrales_log10.length), energia: INFINITO })
    for (let c = nueva.compresiones; c <= CFG.compresion.umbrales_log10.length; c++) revelar({ ...nueva, compresiones: c })
    expect(juego.guias).toEqual([])
    expect(juego.vistos).toEqual(vistos)
  })

  it('migración: un guardado de antes da por vistas las guías de lo que el jugador ya tiene, sin mostrarlas', () => {
    juego.guias = []
    const conMemoria = { ...estadoInicial(), red: { ...estadoInicial().red, memoria: 1 } }
    const v = yaVisto(conMemoria, { tienda: true })
    expect(Object.keys(A).every((k) => v[`auto_${k}`])).toBe(true)
    expect([v.auto, v.guias, v.tienda]).toEqual([true, true, true])
    expect(v.cascada).toBeUndefined() // lo que todavía no tiene se le va a mostrar cuando llegue
    expect(yaVisto(estadoInicial(), { auto_caudal: true }).auto).toBe(true) // ya había visto un autocomprador
    expect(yaVisto(estadoInicial(), {}).auto).toBeUndefined()
    expect(juego.guias).toEqual([])
  })
})
