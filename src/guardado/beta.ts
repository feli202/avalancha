// Capa 2, fase 1B: entrar a la beta y volver a la partida de antes. La pregunta "¿es beta?" es `esBeta` (guardado.ts).
import type { Almacen } from './almacen'
import { CLAVE, CODIGO_BETA, COPIA_BETA, deserializar, guardar, type Partida } from './guardado'

/** La partida tal como estaba al entrar a la beta ("Antes de la beta"). Se escribe al entrar; no rota. */
export const COPIA_ANTES_BETA = 'avalancha.copia.antesDeLaBeta'

/** Guarda "Antes de la beta" y después la partida con la marca. Si la copia no se puede escribir, no se marca nada (tira). */
export function entrarBeta(a: Almacen, p: Partida, codigo: string, ahora: number) {
  if (!CODIGO_BETA.test(codigo)) throw new Error('código de beta inválido')
  const sinMarca: Partida = { ...p, beta: undefined }
  guardar(a, sinMarca) // que la copia sea la partida de ahora, no la del último guardado
  a.escribir(COPIA_ANTES_BETA, a.leer(CLAVE)!)
  guardar(a, { ...p, beta: { codigo, desde: ahora } })
}

/** La partida de antes de la beta, o null (no hay, o no se puede leer). */
export function leerAntesDeBeta(a: Almacen): Partida | null {
  const t = a.leer(COPIA_ANTES_BETA)
  if (t === null) return null
  try { return deserializar(t) } catch { return null }
}

/** Vuelve a la partida de antes de la beta, con la fecha de ahora (si no, todo el tiempo en la beta contaría como ausencia).
 * La beta actual queda en COPIA_BETA (Ajustes → Partida → respaldos), así volver se puede deshacer. */
export function volverDeBeta(a: Almacen, ahora: number) {
  const antes = leerAntesDeBeta(a), actual = a.leer(CLAVE)
  if (antes === null) throw new Error('sin partida de antes de la beta')
  if (actual !== null) a.escribir(COPIA_BETA, actual)
  guardar(a, { ...antes, guardadoEn: ahora })
}
