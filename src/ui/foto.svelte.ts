// "Guardar imagen": la foto del mandala en PNG de 2048 px. En móvil, el menú de compartir del sistema; si no, descarga.
import { anillos, densidad, enInfinito } from '../core'
import { sacarFoto } from '../render/marcos'
import { MARCOS } from '../render/paletas'
import { txt } from '../strings'
import { ajustes } from './ajustes.svelte'
import { formato, formatoMult } from './formato'
import { camara, juego, vigia } from './juego.svelte'

import { elegido } from './logros'

/** El destello (sube al tocar) y el aviso de guardada (sube al terminar): App.svelte los anima con {#key}. */
export const foto = $state({ destello: 0, guardada: 0 })
let ocupada = false

export async function guardarImagen() {
  const toma = camara.foto?.()
  if (!toma || ocupada) return
  ocupada = true
  foto.destello++
  try {
    const s = juego.s
    const energia = enInfinito(s) ? txt.infinito : formato(s.energia)
    const pie = txt.foto.pie(energia, formatoMult(densidad(s)), txt.anillos(anillos(s.granos)))
    const marco = elegido('marco', MARCOS, ajustes.marco, juego.logros)
    const png = await sacarFoto(toma, marco, pie, `${import.meta.env.BASE_URL}logo.svg`, getComputedStyle(document.body).fontFamily)
    if (png) vigia.captura() // Fotógrafo
    if (png && (await entregar(new File([png], txt.opciones.archivoFoto, { type: 'image/png' })))) foto.guardada++
  } finally {
    ocupada = false
  }
}

/** true si se guardó o compartió; false si el jugador cerró el menú de compartir. */
export async function entregar(archivo: File) {
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo] })
      return true
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false // si falla por otra cosa, se descarga
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(archivo)
  a.download = archivo.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  return true
}
