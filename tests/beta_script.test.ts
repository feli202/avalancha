// apps-script/beta.gs con datos falsos: la hoja, Gmail, la caché y las propiedades simuladas en memoria (node:vm).
import { describe, expect, it } from 'vitest'
// @ts-expect-error: módulos de Node sin tipos (el proyecto no instala @types/node)
import { readFileSync } from 'node:fs'
// @ts-expect-error: idem
import vm from 'node:vm'
// @ts-expect-error: idem
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { CODIGO_BETA } from '../src/guardado/guardado'

const FUENTE: string = readFileSync('apps-script/beta.gs', 'utf8')
const URL_APP = 'https://script.google.com/macros/s/PRUEBA/exec'
const conSigno = (b: Uint8Array) => [...b].map((x) => (x > 127 ? x - 256 : x)) // como los da Apps Script

function servicio({ cuota = 100 } = {}) {
  const filas: any[][] = []
  const mails: { para: string; asunto: string; cuerpo: string }[] = []
  const cache = new Map<string, string>()
  const hoja = {
    appendRow: (f: any[]) => void filas.push(f.map((v) => (typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v))), // la hoja guarda el texto sin el '
    getDataRange: () => ({ getValues: () => filas.map((f) => [...f]) }),
    getRange: (r: number, c: number) => ({
      setValue: (v: any) => void (filas[r - 1][c - 1] = v),
      setValues: ([vs]: any[][]) => vs.forEach((v, k) => (filas[r - 1][c - 1 + k] = v)),
    }),
    crudas: [] as any[][],
  }
  const appendCrudo = hoja.appendRow
  hoja.appendRow = (f) => { hoja.crudas.push(f); appendCrudo(f) }
  let creada = false
  const ctx = vm.createContext({
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => (creada ? hoja : null), insertSheet: () => ((creada = true), hoja) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail: (para: string, asunto: string, cuerpo: string) => void mails.push({ para, asunto, cuerpo }), getRemainingDailyQuota: () => cuota },
    Utilities: {
      getUuid: () => randomUUID(),
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (alg: string, t: string) => conSigno(createHash(alg).update(t).digest()),
      computeHmacSha256Signature: (t: string, k: string) => conSigno(createHmac('sha256', k).update(t).digest()),
      base64EncodeWebSafe: (b: number[]) => btoa(String.fromCharCode(...b.map((x) => (x + 256) % 256))).replace(/\+/g, '-').replace(/\//g, '_'),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'clave-de-prueba-0123456789' }) },
    CacheService: { getScriptCache: () => ({ get: (k: string) => cache.get(k) ?? null, put: (k: string, v: string) => void cache.set(k, v) }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t: string) => ({ setMimeType() { return this }, t }) },
    HtmlService: { createHtmlOutput: (html: string) => ({ setTitle() { return this }, html }) },
    ScriptApp: { getService: () => ({ getUrl: () => URL_APP }) },
  })
  vm.runInContext(FUENTE, ctx)
  const g = ctx as any
  const post = (d: object) => JSON.parse(g.doPost({ postData: { contents: JSON.stringify(d) } }).t).r
  /** Los parámetros del link de Aprobar o Rechazar del último mail al dueño. */
  const link = (accion: string) => {
    const u = new URL(mails.filter((m) => m.para === 'gamesexponent@gmail.com').at(-1)!.cuerpo.match(new RegExp(`${URL_APP.replace(/[.?/]/g, '\\$&')}\\?accion=${accion}[^\\s]+`))![0])
    return Object.fromEntries(u.searchParams) as { accion: string; id: string; firma: string }
  }
  return { g, filas, mails, hoja, post, link }
}

describe('apps-script/beta.gs', () => {
  it('solicitar: anota el pedido y manda al dueño los links firmados', () => {
    const s = servicio()
    expect(s.post({ accion: 'solicitar', mail: ' Ana@Mail.com ', nombre: 'ana#1234', idioma: 'en' })).toBe('ok')
    expect(s.filas[0]).toEqual(['fecha', 'mail', 'nombre', 'idioma', 'estado', 'codigo', 'id'])
    expect(s.filas[1].slice(1, 6)).toEqual(['ana@mail.com', 'ana#1234', 'en', 'pendiente', ''])
    expect(s.mails).toHaveLength(1)
    expect(s.mails[0].para).toBe('gamesexponent@gmail.com')
    expect(s.link('aprobar').id).toBe(s.filas[1][6])
    expect(s.link('rechazar').firma).not.toBe(s.link('aprobar').firma)
  })

  it('solicitar: mail mal formado o larguísimo → invalido, sin anotar ni mandar nada', () => {
    const s = servicio()
    for (const mail of ['', 'sin-arroba', 'a@b', 'a b@c.com', `${'x'.repeat(250)}@c.com`, undefined]) expect(s.post({ accion: 'solicitar', mail })).toBe('invalido')
    expect(s.mails).toHaveLength(0)
  })

  it('un pedido por mail cada 24 h y un máximo diario entre todos', () => {
    const s = servicio()
    expect(s.post({ accion: 'solicitar', mail: 'a@b.com' })).toBe('ok')
    expect(s.post({ accion: 'solicitar', mail: 'A@B.com' })).toBe('limite')
    s.filas[1][0] = new Date(Date.now() - 25 * 3600 * 1000) // pasaron 25 h
    expect(s.post({ accion: 'solicitar', mail: 'a@b.com' })).toBe('ok')
    for (let i = 0; i < 39; i++) expect(s.post({ accion: 'solicitar', mail: `j${i}@b.com` })).toBe('ok')
    expect(s.post({ accion: 'solicitar', mail: 'otro@b.com' })).toBe('limite') // 40 en las últimas 24 h
  })

  it('sin cuota de Gmail: limite, y el pedido no queda anotado', () => {
    const s = servicio({ cuota: 1 })
    expect(s.post({ accion: 'solicitar', mail: 'a@b.com' })).toBe('limite')
    expect(s.filas.length).toBeLessThanOrEqual(1)
  })

  it('un nombre con fórmula se guarda como texto', () => {
    const s = servicio()
    s.post({ accion: 'solicitar', mail: 'a@b.com', nombre: '=HYPERLINK("x")' })
    expect(s.hoja.crudas.at(-1)![2]).toBe(`'=HYPERLINK("x")`)
  })

  it('aprobar: el link solo muestra el botón; decidir genera el código, lo manda en su idioma y verificar lo acepta', () => {
    const s = servicio()
    s.post({ accion: 'solicitar', mail: 'ana@mail.com', idioma: 'en' })
    const { accion, id, firma } = s.link('aprobar')
    expect(s.g.doGet({ parameter: { accion, id, firma } }).html).toContain('google.script.run')
    expect(s.filas[1][4]).toBe('pendiente') // abrir el link no aprueba
    expect(s.g.decidir(accion, id, firma)).toMatch(/enviado a ana@mail\.com/)
    const codigo = s.filas[1][5]
    expect(codigo).toMatch(CODIGO_BETA) // el juego lo acepta
    expect(s.filas[1][4]).toBe('aprobado')
    const alJugador = s.mails.at(-1)!
    expect(alJugador.para).toBe('ana@mail.com')
    expect(alJugador.asunto).toBe('Your Avalancha beta code')
    expect(alJugador.cuerpo).toContain(codigo)
    expect(s.g.decidir(accion, id, firma)).toMatch(/ya estaba aprobado/)
    expect(s.post({ accion: 'verificar', codigo })).toBe('ok')
    expect(s.post({ accion: 'verificar', codigo: codigo.toLowerCase() })).toBe('ok')
  })

  it('el mail del código sale en español si el pedido fue en español', () => {
    const s = servicio()
    s.post({ accion: 'solicitar', mail: 'a@b.com', idioma: 'es' })
    const { accion, id, firma } = s.link('aprobar')
    s.g.decidir(accion, id, firma)
    expect(s.mails.at(-1)!.asunto).toBe('Tu código para la beta de Avalancha')
  })

  it('firma falsa o cambiada: no hace nada', () => {
    const s = servicio()
    s.post({ accion: 'solicitar', mail: 'a@b.com' })
    const { id, firma } = s.link('aprobar')
    expect(s.g.doGet({ parameter: { accion: 'aprobar', id, firma: firma.slice(0, -1) + 'A' } }).html).toContain('Link inválido')
    expect(s.g.decidir('aprobar', id, s.link('rechazar').firma)).toBe('Link inválido.')
    expect(s.g.decidir('aprobar', 'otro-id', firma)).toBe('Link inválido.')
    expect(s.g.doGet({ parameter: {} }).html).toContain('Link inválido')
    expect(s.filas[1][4]).toBe('pendiente')
  })

  it('rechazar: queda rechazado, sin código ni mail al jugador', () => {
    const s = servicio()
    s.post({ accion: 'solicitar', mail: 'a@b.com' })
    const { accion, id, firma } = s.link('rechazar')
    expect(s.g.decidir(accion, id, firma)).toBe('Pedido rechazado.')
    expect(s.filas[1].slice(4, 6)).toEqual(['rechazado', ''])
    expect(s.mails).toHaveLength(1)
  })

  it('verificar: código inexistente, pendiente o mal formado → invalido; muchos fallos → limite', () => {
    const s = servicio()
    expect(s.post({ accion: 'verificar', codigo: 'ABCDEFGH' })).toBe('invalido')
    expect(s.post({ accion: 'verificar', codigo: '=1+1' })).toBe('invalido')
    s.post({ accion: 'solicitar', mail: 'a@b.com' })
    const { accion, id, firma } = s.link('aprobar')
    s.g.decidir(accion, id, firma)
    const codigo = s.filas[1][5]
    for (let i = 0; i < 28; i++) s.post({ accion: 'verificar', codigo: 'ZZZZZZZZ' })
    expect(s.post({ accion: 'verificar', codigo })).toBe('limite') // 30 fallos en la hora: ni el bueno pasa
  })

  it('JSON roto o acción desconocida → error', () => {
    const s = servicio()
    expect(JSON.parse(s.g.doPost({ postData: { contents: 'no json' } }).t).r).toBe('error')
    expect(s.post({ accion: 'borrar' })).toBe('error')
  })
})
