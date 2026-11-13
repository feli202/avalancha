// Los 24 logros de la Capa 0: cada uno con textos, mini pila y una recompensa cosmética; 8 de cada tipo, sin repetir.
import { describe, expect, it } from 'vitest'
import { estadoInicial } from '../src/core'
import { EFECTOS, MARCOS, PALETAS } from '../src/render/paletas'
import { ESCENAS } from '../src/render/miniPilas'
import { en } from '../src/strings/en'
import { es } from '../src/strings/es'
import { LOGROS, RECOMPENSA, desbloqueados, elegido, nuevosLogros } from '../src/ui/logros'

const claves = Object.keys(LOGROS)

describe('logros', () => {
  it('son 24, con textos, escena y recompensa', () => {
    expect(claves).toHaveLength(24)
    for (const k of claves) {
      expect(es.logros.lista[k], k).toBeDefined()
      expect(ESCENAS[k], k).toBeDefined()
      expect(RECOMPENSA[k], k).toBeDefined()
    }
    expect(Object.keys(RECOMPENSA).sort()).toEqual([...claves].sort())
  })

  it('las recompensas son 8 paletas, 8 efectos y 8 marcos, todas distintas y existentes', () => {
    const todos = { paleta: Object.keys(PALETAS), efecto: EFECTOS, marco: MARCOS }
    for (const tipo of ['paleta', 'efecto', 'marco'] as const) {
      const ids = Object.values(RECOMPENSA).filter(([t]) => t === tipo).map(([, id]) => id)
      expect(ids, tipo).toHaveLength(8)
      expect(new Set(ids).size, tipo).toBe(8)
      for (const id of ids) {
        expect(todos[tipo].slice(1), `${tipo} ${id}`).toContain(id) // el primero es el de siempre, no se gana
        expect(es.cosmeticos[tipo][id], `${tipo} ${id}`).toBeDefined()
      }
    }
  })

  it('una partida nueva no tiene logros y solo los cosméticos de siempre', () => {
    expect(nuevosLogros(estadoInicial(), 0, {})).toEqual([])
    expect(desbloqueados('paleta', Object.keys(PALETAS), {})).toEqual(['arena'])
    expect(desbloqueados('paleta', Object.keys(PALETAS), { granos: true })).toEqual(['arena', 'brasa'])
    expect(elegido('paleta', Object.keys(PALETAS), 'brasa', {})).toBe('arena') // elegida pero no ganada
  })
})

// shortcut: solo compara claves, no que el texto esté bien traducido.
describe('en.ts', () => {
  const claves = (o: unknown, p = ''): string[] =>
    o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => [p + k, ...claves(v, `${p}${k}.`)]) : []
  it('tiene las mismas claves que es.ts', () => expect(claves(en).sort()).toEqual(claves(es).sort()))
})

describe('logros secretos (I10)', async () => {
  const { SISTEMA, secreto } = await import('../src/ui/logros')
  it('todo SISTEMA apunta a logros que existen', () => for_(Object.keys(SISTEMA)))
  const for_ = (ks: string[]) => ks.forEach((k) => expect(LOGROS[k]).toBeDefined())
  it('sin el sistema visto y sin conseguir: secreto; conseguido o visto: no', () => {
    expect(secreto('cascada', {}, {})).toBe(true)
    expect(secreto('cascada', {}, { cascada: true })).toBe(false)
    expect(secreto('cascada', { cascada: true }, {})).toBe(false)
    expect(secreto('derrumbe', {}, {})).toBe(false)
  })
})
