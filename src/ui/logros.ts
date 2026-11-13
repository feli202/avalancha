// SPEC 7: los 24 logros de la Capa 0, en el orden de la pantalla. Se miran en cada cuadro; una vez conseguido, queda en el guardado.
import { CFG, MUTACIONES, anillos, densidad, type State } from '../core'
import FOTOS from '../assets/pilas.json'
import { txt } from '../strings'

const L = CFG.logros

/** Todos los granos caen al centro: el 4.º derrumba. Con granos_iniciales = 39 (≡ 3 mod 4), el primero que se suelta. */
export const primerDerrumbe = (s: State) => (s.granosTotales >= 1 && s.granos >= 4) || s.compresiones > 0

export const LOGROS: Record<string, (s: State, record: number) => boolean> = {
  derrumbe: (s) => primerDerrumbe(s),
  granos: (s) => s.granos >= L.granos_pila,
  avalancha: (_, r) => r >= L.avalancha,
  colores: (s) => s.colores.every((n) => n > 0),
  hito: (s) => s.colores.some((n) => n >= CFG.hito_colores.cada),
  anillo: (s) => anillos(s.granos) >= L.anillo,
  llena: (s) => s.granos >= FOTOS.capacidad, // la pila de pantalla toca el borde circular
  alud: (_, r) => r >= L.alud,
  compresion: (s) => s.compresiones > 0,
  sinAmbar: (s) => s.compresionesSinAmbar > 0,
  anilloMedio: (s) => anillos(s.granos) >= L.anillo_medio,
  mandala: (s) => s.colores.every((n) => n >= CFG.hito_colores.cada),
  cascada: (s) => s.cascada >= CFG.cascada.nivel_max,
  diez: (s) => s.compresiones >= L.compresiones,
  relampago: (s) => s.mejorCorrida > 0 && s.mejorCorrida < L.corrida_rapida_min * 60,
  piloto: (s) => Object.entries(CFG.autocompradores).every(([k, n]) => s.compresiones >= n && s.auto[k]),
  mutacion: (s) => MUTACIONES.some((m) => s.mutaciones[m] > 0),
  densidad: (s) => densidad(s) >= L.densidad,
  anilloGrande: (s) => anillos(s.granos) >= L.anillo_grande,
  record: (_, r) => r >= L.avalancha_record,
  mutaciones: (s) => MUTACIONES.every((m) => s.mutaciones[m] >= CFG.mutaciones.nivel_max),
  densidadAlta: (s) => densidad(s) >= L.densidad_alta,
  infinito: (s) => s.infinitos > 0,
  infinitoRapido: (s) => s.infinitos > 0 && s.tiempoTotal < L.infinito_rapido_horas * 3600,
}

/** Los que se cumplen ahora y todavía no están en `tiene`. */
export const nuevosLogros = (s: State, record: number, tiene: Record<string, boolean>) =>
  Object.keys(LOGROS).filter((k) => !tiene[k] && LOGROS[k](s, record))

/** El número de cada logro que va en su nombre o descripción (los textos están en txt.logros). */
export const UMBRAL: Record<string, number> = {
  granos: L.granos_pila, avalancha: L.avalancha, hito: CFG.hito_colores.cada, anillo: L.anillo, densidad: L.densidad,
  anilloGrande: L.anillo_grande, record: L.avalancha_record, infinitoRapido: L.infinito_rapido_horas,
  alud: L.alud, anilloMedio: L.anillo_medio, mandala: CFG.hito_colores.cada, diez: L.compresiones,
  relampago: L.corrida_rapida_min, densidadAlta: L.densidad_alta,
}

const conNumero = (t: string | ((n: string) => string), k: string) =>
  typeof t === 'string' ? t : t(UMBRAL[k]?.toLocaleString(txt.locale) ?? '')
/** Nombre y descripción de un logro, con su número. */
export const nombreLogro = (k: string) => conNumero(txt.logros.lista[k][0], k)
export const descLogro = (k: string) => conNumero(txt.logros.lista[k][1], k)

/** I10: el sistema (clave de juego.vistos) que nombra cada logro; sin conseguir y sin ese sistema visto, se muestra como ???. */
export const SISTEMA: Record<string, string> = {
  colores: 'color3', hito: 'color0', mandala: 'color3', anillo: 'anillos', anilloMedio: 'anillos', anilloGrande: 'anillos',
  compresion: 'compresion', sinAmbar: 'compresion', diez: 'compresion', relampago: 'compresion', densidad: 'compresion',
  densidadAlta: 'compresion', infinito: 'compresion', infinitoRapido: 'compresion', piloto: 'auto_caudal', cascada: 'cascada',
  mutacion: 'mutaciones', mutaciones: 'mutaciones',
}
export const secreto = (k: string, logros: Record<string, boolean>, vistos: Record<string, boolean>) =>
  !logros[k] && !!SISTEMA[k] && !vistos[SISTEMA[k]]

export type Cosmetico = 'paleta' | 'efecto' | 'marco'
/** Recompensa de cada logro: solo cosmética (paletas.ts), sin efecto en el balance. */
export const RECOMPENSA: Record<string, [Cosmetico, string]> = {
  derrumbe: ['efecto', 'blanco'], granos: ['paleta', 'brasa'], avalancha: ['efecto', 'estela'], colores: ['paleta', 'aurora'],
  hito: ['marco', 'fino'], anillo: ['marco', 'anillos'], llena: ['paleta', 'glaciar'], alud: ['efecto', 'chispas'],
  compresion: ['marco', 'doble'], sinAmbar: ['paleta', 'ceniza'], anilloMedio: ['marco', 'orbitas'], mandala: ['paleta', 'musgo'],
  cascada: ['efecto', 'cascada'], diez: ['marco', 'muescas'], relampago: ['efecto', 'relampago'], piloto: ['paleta', 'tinta'],
  mutacion: ['efecto', 'mutante'], densidad: ['marco', 'denso'], anilloGrande: ['marco', 'rosa'], record: ['efecto', 'arcoiris'],
  mutaciones: ['paleta', 'negativo'], densidadAlta: ['efecto', 'oro'], infinito: ['marco', 'infinito'], infinitoRapido: ['paleta', 'oroViejo'],
}

/** Los cosméticos de un tipo que ya se pueden usar: el de siempre (el primero de la lista) y los de los logros conseguidos. */
export const desbloqueados = (tipo: Cosmetico, todos: string[], tiene: Record<string, boolean>) =>
  todos.filter((id, i) => i === 0 || Object.entries(RECOMPENSA).some(([k, [t, r]]) => t === tipo && r === id && tiene[k]))

/** El logro que da un cosmético (undefined para el de siempre). */
export const logroDe = (tipo: Cosmetico, id: string) =>
  Object.keys(RECOMPENSA).find((k) => RECOMPENSA[k][0] === tipo && RECOMPENSA[k][1] === id)

/** El cosmético elegido si está desbloqueado; si no, el de siempre. */
export const elegido = (tipo: Cosmetico, todos: string[], id: string, tiene: Record<string, boolean>) =>
  desbloqueados(tipo, todos, tiene).includes(id) ? id : todos[0]

/**
 * Capas de la pantalla de logros. Solo la 0 tiene logros; las siguientes aparecen bloqueadas hasta su condición.
 * shortcut: la Capa 1 todavía no existe; cuando exista, sumar sus logros acá y su condición real.
 */
export const CAPAS: { id: string; logros: string[]; abierta: (s: State) => boolean }[] = [
  { id: 'pila', logros: Object.keys(LOGROS), abierta: () => true },
  { id: 'cristalizacion', logros: [], abierta: () => false },
]
