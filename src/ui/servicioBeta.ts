// Capa 2, fase 1B: lo que habla con el servicio de la beta (apps-script/beta.gs, una aplicación web de Google Apps Script).
import { BETA_URL } from '../comunidad'

/** ok: código válido o pedido anotado · invalido: código o mail que no sirve · limite: muchos intentos o pedidos. */
export type RespuestaBeta = 'ok' | 'invalido' | 'limite' | 'error' | 'sinConexion'

export const mailValido = (m: string) => m.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m)
/** Como lo escribe la gente: minúsculas, espacios o guiones ("abcd-2345"). */
export const normalizarCodigo = (c: string) => c.toUpperCase().replace(/[\s-]/g, '')

/** text/plain: un pedido "simple" que no dispara el preflight de CORS (Apps Script no responde OPTIONS). */
export async function pedirBeta(datos: Record<string, string>, url = BETA_URL, f: typeof fetch = fetch): Promise<RespuestaBeta> {
  if (!url) return 'error'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'sinConexion'
  let r: Response
  try {
    r = await f(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos), signal: AbortSignal.timeout(20_000) })
  } catch (e) {
    return (e as Error)?.name === 'TypeError' ? 'sinConexion' : 'error' // TypeError: sin red; timeout u otro: error
  }
  try {
    const j = await r.json()
    return (['ok', 'invalido', 'limite'] as const).includes(j?.r) ? j.r : 'error'
  } catch { return 'error' }
}
