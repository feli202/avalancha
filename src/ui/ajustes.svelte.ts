// Ajustes (SPEC 6.8 y 8): se guardan solos en cada cambio, aparte de la partida.
import { almacenLocal } from '../guardado/almacen'
import { AJUSTES } from '../guardado/guardado'
import { idioma } from '../strings'
import { aplicarVolumen } from './sonido'

const base = {
  /** Lo elige strings/index.ts; cambiarlo recarga la página. */
  idioma: idioma as string,
  notacion: 'cientifica' as 'cientifica' | 'ingenieria',
  /** 0–1: el general y uno por tipo de sonido (SPEC 6.7, sonido.ts). */
  volumen: 0.8,
  volDerrumbes: 0.6,
  volCompras: 0.8,
  volHitos: 0.8,
  volFondo: 0.4,
  /** SPEC 6.8: arranca como pida el sistema. */
  reducirDestellos: matchMedia('(prefers-reduced-motion: reduce)').matches,
  daltonismo: false,
  /** Cosméticos de los logros (paletas.ts); si el elegido no está desbloqueado, se usa el primero (logros.ts, elegido). */
  paleta: 'arena',
  efecto: 'normal',
  marco: 'ninguno',
}

/** Lo guardado, campo por campo: lo que falta o tiene otro tipo queda como en `base`. */
function leer() {
  try {
    const g = JSON.parse(almacenLocal.leer(AJUSTES) ?? '{}')
    return Object.fromEntries(
      Object.entries(base).map(([k, v]) => [k, typeof g?.[k] === typeof v ? g[k] : v]),
    ) as typeof base
  } catch {
    return { ...base }
  }
}

export const ajustes = $state(leer())

$effect.root(() => {
  $effect(() => {
    const texto = JSON.stringify(ajustes)
    try { almacenLocal.escribir(AJUSTES, texto) } catch { /* sin almacenamiento: duran hasta recargar */ }
  })
  $effect(() => void [ajustes.volumen, ajustes.volDerrumbes, ajustes.volCompras, ajustes.volHitos, ajustes.volFondo, aplicarVolumen()])
  $effect(() => void document.documentElement.classList.toggle('daltonismo', ajustes.daltonismo))
  $effect(() => void (document.documentElement.lang = ajustes.idioma))
})
