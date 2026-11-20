// Pase de partida de itch.io a la versión instalable (GitHub Pages): son sitios distintos y cada uno tiene su localStorage.
// La partida viaja comprimida en el hash de la URL (#import=...), que el navegador nunca manda al servidor.
// Formato: A<versión de guardado>-<FNV-1a del JSON, 8 hex>-<JSON comprimido con deflate-raw, base64url>.
import { CLAVE, VERSION, deserializar, guardar, importar, serializar, type Partida } from './guardado'
import type { Almacen } from './almacen'

/** Copia de la partida que había antes de cargar una de itch.io. Se recupera desde Ajustes → Partida. */
export const RESPALDO_PASE = 'avalancha.respaldo.pase'
/** Más largo que esto no se manda por URL (algunos navegadores y la barra de direcciones cortan): exportar/importar a mano. */
export const LARGO_MAX_URL = 60_000

export type ErrorPase = 'formato' | 'corrupto' | 'nueva' | 'invalida'
export class FalloPase extends Error {
  constructor(readonly motivo: ErrorPase) { super(`pase: ${motivo}`) }
}

function fnv(texto: string) {
  let h = 0x811c9dc5
  for (const b of new TextEncoder().encode(texto)) h = Math.imul(h ^ b, 0x01000193)
  return (h >>> 0).toString(16).padStart(8, '0')
}

async function pasar(bytes: Uint8Array, flujo: CompressionStream | DecompressionStream) {
  return new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(flujo)).arrayBuffer())
}
const aB64 = (b: Uint8Array) => {
  let s = ''
  for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const deB64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

export async function codificarPase(p: Partida): Promise<string> {
  const json = serializar(p)
  return `A${VERSION}-${fnv(json)}-${aB64(await pasar(new TextEncoder().encode(json), new CompressionStream('deflate-raw')))}`
}

/** Tira FalloPase si el código no es una partida que este juego pueda cargar. No toca el almacenamiento. */
export async function decodificarPase(codigo: string): Promise<Partida> {
  const m = /^A(\d+)-([0-9a-f]{8})-([A-Za-z0-9_-]+)$/.exec(codigo.trim())
  if (!m) throw new FalloPase('formato')
  if (+m[1] > VERSION) throw new FalloPase('nueva')
  let json: string
  try { json = new TextDecoder('utf-8', { fatal: true }).decode(await pasar(deB64(m[3]), new DecompressionStream('deflate-raw'))) } catch { throw new FalloPase('corrupto') }
  if (fnv(json) !== m[2]) throw new FalloPase('corrupto')
  let version: unknown
  try { version = JSON.parse(json)?.version } catch { throw new FalloPase('corrupto') }
  if (typeof version === 'number' && version > VERSION) throw new FalloPase('nueva')
  try { return deserializar(json) } catch { throw new FalloPase('invalida') }
}

/** Un código pegado: el del pase (A3-...) o el de Ajustes → Exportar. Tira FalloPase si no es una partida. No toca el almacenamiento. */
export async function leerCodigo(texto: string): Promise<Partida> {
  const limpio = texto.replace(/\s/g, '')
  if (/^A\d+-/.test(limpio)) return decodificarPase(limpio)
  try { return importar(limpio) } catch { throw new FalloPase('formato') }
}

/** La dirección de la app con la partida en el hash, o null si queda demasiado larga para una URL. */
export function urlConPase(base: string, codigo: string): string | null {
  const url = `${base.split('#')[0]}#import=${codigo}`
  return url.length > LARGO_MAX_URL ? null : url
}

/** El código del hash (#import=...), o null. */
export const paseDeHash = (hash: string): string | null => /^#import=(.+)$/.exec(hash)?.[1] ?? null

/** Escribe la partida de itch.io, después de guardar una copia de la que había (si había). Solo con la confirmación del jugador.
 * Si la copia no se puede escribir, no se reemplaza nada (tira el error). */
export function reemplazarConRespaldo(a: Almacen, nueva: Partida) {
  const vieja = a.leer(CLAVE)
  if (vieja !== null) a.escribir(RESPALDO_PASE, vieja)
  guardar(a, nueva)
}

/** Vuelve a la partida del respaldo; la actual pasa a ser el respaldo (se puede deshacer igual). */
export function restaurarRespaldo(a: Almacen) {
  const r = a.leer(RESPALDO_PASE), actual = a.leer(CLAVE)
  if (r === null) throw new Error('sin respaldo')
  if (actual !== null) a.escribir(RESPALDO_PASE, actual)
  a.escribir(CLAVE, r)
}

/** La partida guardada antes del último pase, o null (no hay, o no se puede leer). */
export function leerRespaldoPase(a: Almacen): Partida | null {
  const t = a.leer(RESPALDO_PASE)
  if (t === null) return null
  try { return deserializar(t) } catch { return null }
}
