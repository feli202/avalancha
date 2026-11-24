// El idioma se elige al cargar; cambiarlo recarga la página (Opciones.svelte), así nada queda con el texto viejo.
// Lee el ajuste guardado directo (sin ajustes.svelte.ts) para que los tests puedan importar textos sin DOM.
import { almacenLocal } from '../guardado/almacen'
import { AJUSTES } from '../guardado/guardado'
import { en } from './en'
import { es } from './es'

function guardado(): unknown {
  try { return JSON.parse(almacenLocal.leer(AJUSTES) ?? '{}')?.idioma } catch { return undefined }
}

/** El guardado; si no hay, el del navegador: español si empieza con "es", si no, inglés. */
const g = guardado()
// VITE_IDIOMA: idioma de entrada de un build (galaxy.click sale en inglés); el ajuste guardado manda igual.
const porBuild = import.meta.env?.VITE_IDIOMA
export const idioma = g === 'es' || g === 'en' ? g : porBuild === 'es' || porBuild === 'en' ? porBuild : globalThis.navigator?.language?.startsWith('es') ? 'es' : 'en'
export const txt = idioma === 'en' ? en : es
