// Ajustes (SPEC 6.8 y 8): se guardan solos en cada cambio, aparte de la partida.
import { almacenLocal } from '../guardado/almacen'
import { AJUSTES } from '../guardado/guardado'

const base = {
  notacion: 'cientifica' as 'cientifica' | 'ingenieria',
  /** 0–1. shortcut: todavía no hay sonido (hito 6); queda guardado para cuando llegue. */
  volumen: 0.8,
  /** SPEC 6.8: arranca como pida el sistema. */
  reducirDestellos: matchMedia('(prefers-reduced-motion: reduce)').matches,
  daltonismo: false,
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
  $effect(() => void document.documentElement.classList.toggle('daltonismo', ajustes.daltonismo))
})
