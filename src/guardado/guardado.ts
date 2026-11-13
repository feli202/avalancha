// Guardado (SPEC 8): la partida como JSON con versión. Puro: el almacenamiento entra como Almacen.
import Decimal from 'break_infinity.js'
import { estadoInicial, type State } from '../core'
import type { Almacen } from './almacen'
import { limpiarHistorial, type Historial } from './historial'

export const VERSION = 2
export const CLAVE = 'avalancha.guardado'
/** Copia del último guardado que no se pudo leer. Nunca se borra sola: uno distinto mueve el anterior a RESPALDO.<fecha>. */
export const RESPALDO = 'avalancha.respaldo'
/** Ajustes del jugador: aparte de la partida, así "Borrar partida" no los toca. */
export const AJUSTES = 'avalancha.ajustes'

export interface Partida {
  estado: State
  /** Reloj real (ms) del guardado: de acá sale el tiempo fuera de línea. */
  guardadoEn: number
  /** SPEC 5: lo que ya apareció. */
  vistos: Record<string, boolean>
  /** Avalancha récord de la pila visual. */
  record: number
  /** SPEC 7: logros conseguidos (los de la corrida, como Anillo 10, no se pueden recalcular después). */
  logros: Record<string, boolean>
  /** Para Estadísticas (historial.ts). Opcional: los guardados de antes no lo tienen. */
  historial?: Historial
}

// Decimal como [mantisa, exponente]: dos doubles, que JSON guarda sin perder un dígito.
const dec = (d: Decimal) => [d.mantissa, d.exponent]
const plano = (p: Partida) => ({
  version: VERSION,
  ...p,
  estado: { ...p.estado, energia: dec(p.estado.energia), maxEnergia: dec(p.estado.maxEnergia) },
})
type Plano = ReturnType<typeof plano>

export const serializar = (p: Partida) => JSON.stringify(plano(p))

/** Lleva un guardado viejo a la versión actual, de a una versión por vez. */
function migrar(d: any): any {
  if (d?.version === 1 && typeof d.estado === 'object' && d.estado) {
    // 2: estadísticas y logros (hito 5b). Los granos de corridas pasadas no se sabían: arranca con los de esta.
    d.estado = { granosTotales: d.estado.granos, mejorCorrida: 0, compresionesSinAmbar: 0, ...d.estado }
    d.logros = {}
    d.version = 2
  }
  // Guardados del desarrollo del hito 5b (código a medio recargar): versión 2 sin logros.
  if (d?.version === 2 && typeof d === 'object' && d.logros === undefined) d.logros = {}
  return d
}

/** x tiene todos los campos de modelo, con los mismos tipos (números finitos). */
function mismaForma(modelo: unknown, x: unknown): boolean {
  if (typeof modelo === 'number') return typeof x === 'number' && Number.isFinite(x)
  if (typeof modelo !== 'object' || modelo === null) return typeof x === typeof modelo
  if (typeof x !== 'object' || x === null || Array.isArray(x) !== Array.isArray(modelo)) return false
  return Object.keys(modelo).every((k) => mismaForma((modelo as any)[k], (x as any)[k]))
}
const MODELO = plano({ estado: estadoInicial(), guardadoEn: 0, vistos: {}, record: 0, logros: {} })

/** Completa con el modelo los campos que faltan (un campo nuevo sin migración, un color o autocomprador nuevo). */
function completar(modelo: any, x: any): any {
  if (typeof modelo !== 'object' || modelo === null || Array.isArray(modelo)) return x === undefined ? modelo : x
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return x
  const r = { ...x }
  for (const k of Object.keys(modelo)) r[k] = completar(modelo[k], x[k])
  return r
}

/** Tira un error si el texto no es un guardado válido. Lo que falta se completa; un tipo equivocado se rechaza. */
export function deserializar(texto: string): Partida {
  let d: Plano = migrar(JSON.parse(texto))
  // Sin estado o sin fecha no es una partida: no se inventa una entera.
  if (d?.version !== VERSION || typeof d.estado !== 'object' || d.estado === null || typeof d.guardadoEn !== 'number') throw new Error('guardado inválido')
  d = completar(MODELO, d)
  // Un arreglo que se acortó (un color que falta al final): se completa con los del modelo.
  const c = d.estado.colores
  if (Array.isArray(c) && c.length < MODELO.estado.colores.length) d.estado.colores = [...c, ...MODELO.estado.colores.slice(c.length)]
  if (!mismaForma(MODELO, d)) throw new Error('guardado inválido')
  const e = d.estado
  const deDec = ([m, x]: number[]) => Decimal.fromMantissaExponent_noNormalize(m, x)
  return {
    estado: { ...e, energia: deDec(e.energia), maxEnergia: deDec(e.maxEnergia) },
    guardadoEn: d.guardadoEn,
    vistos: d.vistos,
    record: d.record,
    logros: d.logros,
    // Partidas de antes del historial: no viene, y el juego arranca uno con el comienzo estimado por el tiempo de juego.
    ...((d as any).historial !== undefined && { historial: limpiarHistorial((d as any).historial, d.guardadoEn - e.tiempoTotal * 1000) }),
  }
}

// Exportar / importar (SPEC 8): el mismo JSON en base64, para copiar y pegar. Por bytes UTF-8: btoa solo acepta latin-1.
export const exportar = (p: Partida) => btoa(String.fromCharCode(...new TextEncoder().encode(serializar(p))))

/** Tira un error si el texto no es un guardado exportado válido. */
export function importar(texto: string): Partida {
  const bin = atob(texto.replace(/\s/g, ''))
  return deserializar(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))))
}

export const guardar = (a: Almacen, p: Partida) => a.escribir(CLAVE, serializar(p))

/** null: no hay guardado. 'corrupto': no se pudo leer; el texto queda copiado en RESPALDO y el guardado, sin tocar.
 * `ahora` (ms) nombra la copia del respaldo anterior si había otro distinto. */
export function cargar(a: Almacen, ahora: number): Partida | null | 'corrupto' {
  const texto = a.leer(CLAVE)
  if (texto === null) return null
  try {
    return deserializar(texto)
  } catch {
    try {
      const viejo = a.leer(RESPALDO)
      if (viejo !== null && viejo !== texto) a.escribir(`${RESPALDO}.${ahora}`, viejo)
      a.escribir(RESPALDO, texto)
    } catch { /* sin lugar: el original sigue en CLAVE hasta que se empiece de nuevo */ }
    return 'corrupto'
  }
}
