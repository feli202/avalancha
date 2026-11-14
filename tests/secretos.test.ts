// Logros secretos: la condición de cada uno (secretos.ts) y sus datos (config, cadenas, recompensas).
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import { CFG, comprar, estadoInicial, tick, type State } from '../src/core'
import { EFECTOS, FONDOS, MARCOS, PALETAS } from '../src/render/paletas'
import { en } from '../src/strings/en'
import { es } from '../src/strings/es'
import { LOGROS, RECOMPENSA, SECRETOS, desbloqueados, logroDe, premioSecreto } from '../src/ui/logros'
import { Vigia, capicua, contadoresVacios, monocromo, transicion, volviste } from '../src/ui/secretos'

const MIN = 60_000
const con = (cambios: Partial<State>): State => ({ ...estadoInicial(), ...cambios })
/** Un vigía nuevo y la lista de lo que fue ganando. */
function vigia() {
  const ganados: string[] = []
  return { v: new Vigia(contadoresVacios(), (k) => ganados.push(k)), ganados }
}

describe('datos de los secretos', () => {
  it('son 16, con nombre, descripción y pista en los dos idiomas, y nombre para Steam', () => {
    expect(SECRETOS).toHaveLength(16)
    for (const k of SECRETOS) {
      expect(es.logros.secretosLista[k], k).toHaveLength(3)
      expect(en.logros.secretosLista[k], k).toHaveLength(3)
      expect(CFG.secretos[k].api, k).toMatch(/^[A-Z0-9_]+$/)
      expect(LOGROS[k], `${k} no pisa un logro`).toBeUndefined()
    }
    expect(new Set(SECRETOS.map((k) => CFG.secretos[k].api)).size).toBe(16)
  })

  it('cada recompensa existe, tiene nombre y no la da otro logro', () => {
    const todos: Record<string, string[]> = { paleta: Object.keys(PALETAS), efecto: EFECTOS, marco: MARCOS, fondo: FONDOS, especial: ['lluvia'] }
    const usados = new Set(Object.values(RECOMPENSA).map(([t, id]) => `${t}:${id}`))
    for (const k of SECRETOS) {
      const [tipo, id] = premioSecreto(k)
      expect(todos[tipo], `${k}: ${tipo}:${id}`).toContain(id)
      expect(es.cosmeticos[tipo][id], `${tipo}:${id}`).toBeDefined()
      expect(usados.has(`${tipo}:${id}`), `${tipo}:${id} repetido`).toBe(false)
      usados.add(`${tipo}:${id}`)
      if (tipo === 'fondo') expect(CFG.fondos[id], `fondos.${id}`).toBe(k) // config de fondos y de secretos dicen lo mismo
    }
  })

  it('fondos: Noche de inicio, cada uno con nombre y el logro que lo da', () => {
    expect(FONDOS[0]).toBe('noche')
    expect(desbloqueados('fondo', FONDOS, {})).toEqual(['noche'])
    expect(desbloqueados('fondo', FONDOS, { compresion: true, minimalista: true })).toEqual(['noche', 'arenaSeca', 'vacio'])
    for (const id of FONDOS) expect(es.cosmeticos.fondo[id], id).toBeDefined()
    expect(logroDe('fondo', 'milimetrado')).toBe('anillo')
    expect(logroDe('fondo', 'fractal')).toBe('infinito')
    expect(logroDe('fondo', 'hielo')).toBe('cristal') // Capa 1: todavía no se puede conseguir
    expect(es.logros.lista.cristal).toBeDefined()
    expect(logroDe('marco', 'galleta')).toBe('galleta')
  })
})

describe('condiciones', () => {
  it('Esto no es un clicker: 50 clics en menos de 10 s, aunque pasen el tope del Puñado', () => {
    const { v, ganados } = vigia()
    for (let i = 0; i < 49; i++) v.clic(i * 150) // 49 clics en 7,2 s (casi 7 por segundo... y con el tope de 8/s)
    expect(ganados).toEqual([])
    v.clic(49 * 150)
    expect(ganados).toEqual(['galleta'])
    const lento = vigia()
    for (let i = 0; i < 100; i++) lento.v.clic(i * 250) // 4 por segundo: nunca 50 en 10 s
    expect(lento.ganados).toEqual([])
    const rapido = vigia()
    for (let i = 0; i < 50; i++) rapido.v.clic(i * 20) // 50 por segundo: muy por encima de los 8/s del Puñado
    expect(rapido.ganados).toEqual(['galleta'])
  })

  it('Paciencia geológica: 10 min sin tocar nada con la pila a la vista', () => {
    const { v, ganados } = vigia()
    const s = estadoInicial()
    for (let t = 0; t <= 10 * MIN; t += 500) v.cuadro(t, s, true, 12)
    expect(ganados).toContain('paciencia')
    // Un toque o un panel encima reinician la cuenta.
    const b = vigia()
    for (let t = 0; t <= 10 * MIN; t += 500) {
      if (t === 5 * MIN) b.v.tocar(t)
      b.v.cuadro(t, s, t !== 7 * MIN, 12)
    }
    expect(b.ganados).not.toContain('paciencia')
    // La pestaña oculta (un hueco entre cuadros) no cuenta.
    const c = vigia()
    c.v.cuadro(0, s, true, 12)
    c.v.cuadro(11 * MIN, s, true, 12)
    expect(c.ganados).not.toContain('paciencia')
  })

  it('1987: una sola avalancha de 1.987 derrumbes o más', () => {
    const { v, ganados } = vigia()
    v.avalancha(1986)
    expect(ganados).toEqual([])
    v.avalancha(1987)
    expect(ganados).toEqual(['anio1987'])
  })

  it('Tormenta perfecta: 300 veces el promedio de la corrida, con suficientes avalanchas para medirlo', () => {
    const { v, ganados } = vigia()
    v.cuadro(0, estadoInicial(), true, 0)
    v.avalancha(1)
    v.avalancha(500) // pocas muestras: no cuenta
    expect(ganados).toEqual([])
    for (let i = 0; i < 200; i++) v.avalancha(2)
    v.avalancha(400) // el promedio es ~4,4 (1 + 500 + 400 en 202): 400 no llega a 300 veces
    expect(ganados).toEqual([])
    v.avalancha(3000) // el promedio ya es ~6,4: 300 veces es ~1.920
    expect(ganados).toContain('tormenta') // y 1987, de paso
    // Al comprimir, el promedio empieza de cero.
    const b = vigia()
    b.v.cuadro(0, estadoInicial(), true, 0)
    for (let i = 0; i < 200; i++) b.v.avalancha(2)
    b.v.cuadro(1, con({ compresiones: 1 }), true, 0)
    b.v.avalancha(1000)
    expect(b.ganados).toEqual([])
  })

  it('Conmutativo: Coral antes que Ámbar en la misma corrida', () => {
    const a = con({ colores: [0, 0, 0, 0] })
    expect(transicion(a, con({ colores: [0, 1, 0, 0] }), 0)).toContain('conmutativo')
    expect(transicion(a, con({ colores: [1, 1, 0, 0] }), 0)).not.toContain('conmutativo') // juntos (Comprar todo va en orden)
    expect(transicion(con({ colores: [3, 0, 0, 0] }), con({ colores: [3, 1, 0, 0] }), 0)).not.toContain('conmutativo')
  })

  it('Minimalista: comprimir sin Caudal en esa corrida', () => {
    const despues = con({ compresiones: 1 })
    expect(transicion(con({ caudal: 0 }), despues, 0)).toContain('minimalista')
    expect(transicion(con({ caudal: 2 }), despues, 0)).not.toContain('minimalista')
    expect(transicion(con({ caudal: 0 }), con({ caudal: 0 }), 0)).not.toContain('minimalista') // sin comprimir
  })

  it('Monocromo: 1e12 de Energía con solo Ámbar comprado', () => {
    const e = new Decimal(1e12)
    expect(monocromo(con({ energia: e, colores: [5, 0, 0, 0] }))).toBe(true)
    expect(monocromo(con({ energia: new Decimal(9e11), colores: [5, 0, 0, 0] }))).toBe(false)
    expect(monocromo(con({ energia: e, colores: [5, 1, 0, 0] }))).toBe(false)
    expect(monocromo(con({ energia: e, colores: [0, 0, 0, 0] }))).toBe(false)
    expect(transicion(estadoInicial(), con({ energia: e, colores: [5, 0, 0, 0] }), 0)).toContain('monocromo')
  })

  it('Microscopio: toda la corrida con el zoom al máximo, hasta comprimir', () => {
    const a = con({ tiempoCorrida: 600 })
    const d = con({ compresiones: 1 })
    expect(transicion(a, d, 599)).toContain('microscopio')
    expect(transicion(a, d, 400)).not.toContain('microscopio')
    expect(transicion(a, con({ tiempoCorrida: 601 }), 600)).not.toContain('microscopio') // sin comprimir
  })

  it('Fotógrafo: 111 fotos acumuladas (el contador va en el guardado)', () => {
    const { v, ganados } = vigia()
    for (let i = 0; i < 110; i++) v.captura()
    expect(ganados).toEqual([])
    v.captura()
    expect(ganados).toEqual(['fotografo'])
    expect(v.c.capturas).toBe(111)
  })

  it('Insomnio: las 24 horas del reloj, en cualquier día y orden', () => {
    const { v, ganados } = vigia()
    const s = estadoInicial()
    const orden = [5, 17, 0, 23, 11, 3, 8, 20, 14, 1, 22, 6, 9, 13, 2, 19, 7, 16, 4, 21, 10, 15, 12]
    orden.forEach((h, i) => v.cuadro(i * 86_400_000, s, false, h))
    expect(ganados).not.toContain('insomnio') // faltan las 18
    v.cuadro(30 * 86_400_000, s, false, 18)
    expect(ganados).toContain('insomnio')
  })

  it('Capicúa: solo después de una compra a mano, nunca con autocompradores', () => {
    expect(capicua(con({ caudal: 12, colores: [7, 3, 7, 12] }))).toBe(true)
    expect(capicua(con({ caudal: 2, colores: [1, 0, 1, 2] }))).toBe(true) // 4 distintos de cero
    expect(capicua(con({ caudal: 1, colores: [0, 0, 0, 1] }))).toBe(false) // solo 2 distintos de cero
    expect(capicua(con({ caudal: 0, colores: [0, 0, 0, 0] }))).toBe(false)
    expect(capicua(con({ caudal: 12, colores: [7, 3, 8, 12] }))).toBe(false)

    // Un estado capicúa al que se llega con los autocompradores no da nada: el bucle no llama a compraManual.
    const pal = con({ caudal: 2, colores: [1, 0, 1, 2], energia: new Decimal(0), compresiones: 5 })
    const { v, ganados } = vigia()
    const auto = tick(pal, 0.05)
    v.cuadro(0, auto, true, 0)
    transicion(pal, auto, 0)
    expect(ganados).toEqual([])
    v.compraManual(pal)
    expect(ganados).toEqual(['capicua'])

    // Una compra real: Caudal 1 → 2 deja 2·1·0·1·2.
    const antes = con({ caudal: 1, colores: [1, 0, 1, 2], energia: new Decimal(1e30) })
    const b = vigia()
    b.v.compraManual(comprar(antes, 'caudal'))
    expect(b.ganados).toEqual(['capicua'])
  })

  it('Volviste: 7 días sin abrir el juego', () => {
    const dia = 86_400_000
    expect(volviste(10 * dia, 3 * dia)).toBe(true)
    expect(volviste(10 * dia, 3 * dia + 1)).toBe(false)
  })

  it('Al borde: 1e307 de Energía 10 min sin llegar al Infinito', () => {
    const { v, ganados } = vigia()
    const borde = con({ energia: new Decimal(1e307) })
    for (let t = 0; t < 10 * MIN; t += 1000) v.cuadro(t, borde, true, 0)
    expect(ganados).not.toContain('borde')
    v.cuadro(10 * MIN, borde, true, 0)
    expect(ganados).toContain('borde')
    // Con el Infinito, o si la Energía baja, la espera se corta.
    const b = vigia()
    for (let t = 0; t <= 10 * MIN; t += 1000) b.v.cuadro(t, t === 5 * MIN ? con({ energia: new Decimal(1e306) }) : borde, true, 0)
    expect(b.ganados).not.toContain('borde')
    const c = vigia()
    for (let t = 0; t <= 10 * MIN; t += 1000) c.v.cuadro(t, con({ energia: new Decimal(1e307), infinitos: 1 }), true, 0)
    expect(c.ganados).not.toContain('borde')
  })

  it('Konami: la secuencia exacta, aunque venga después de otras teclas', () => {
    const { v, ganados } = vigia()
    const K = CFG.secretos.konami.teclas as string[]
    v.tecla('KeyX', 'x')
    K.slice(0, -1).forEach((k) => v.tecla(k, ''))
    expect(ganados).toEqual([])
    v.tecla(K.at(-1)!, 'a')
    expect(ganados).toEqual(['konami'])
    const b = vigia()
    ;[...K.slice(0, 4), 'ArrowRight', ...K.slice(4)].forEach((k) => b.v.tecla(k, ''))
    expect(b.ganados).toEqual([])
  })

  it('Arena: «arena» o «sand», y la lluvia vuelve cada vez', () => {
    const { v, ganados } = vigia()
    const escribir = (p: string) => [...p].map((ch) => v.tecla(`Key${ch.toUpperCase()}`, ch))
    expect(escribir('aren')).toEqual([0, 0, 0, 0])
    expect(escribir('a')).toEqual([5])
    expect(escribir('SaNd').at(-1)).toBe(4) // sin importar mayúsculas
    expect(escribir('arena').at(-1)).toBe(5)
    expect(escribir('are na').at(-1)).toBe(0)
    expect(ganados.filter((k) => k === 'arena')).toHaveLength(3) // juego.svelte.ts lo anota una sola vez
  })
})
