// Ajustes (SPEC 6.8 y 8): se guardan solos en cada cambio, aparte de la partida.
import { almacenLocal } from '../guardado/almacen'
import { AJUSTES } from '../guardado/guardado'
import { idioma } from '../strings'
import { aplicarVolumen } from './sonido'
import { esMovil } from '../instalar.svelte'

const base = {
  /** Lo elige strings/index.ts; cambiarlo recarga la página. */
  idioma: idioma as string,
  notacion: 'cientifica' as string, // v1.0: una de NOTACIONES (formato.ts); una que no existe se lee como científica
  /** 0–1: general, efectos y música (SPEC 6.7, sonido.ts). */
  volumen: 0.8,
  volEfectos: 0.8,
  volMusica: 0.5,
  /** SPEC 6.8: arranca como pida el sistema. */
  reducirDestellos: matchMedia('(prefers-reduced-motion: reduce)').matches,
  /** CORRECCIONES 1: interfaz tranquila (las compras automáticas no encienden su fila; números a 10 Hz). Es el
   * "Reducir destellos" de Ajustes; `reducirDestellos` (de antes) es el de la pila y el movimiento. */
  calma: true,
  daltonismo: false,
  /** v1.0, bloque 8: "Enviar estadísticas anónimas" (estadisticasAnonimas.ts). Do Not Track gana siempre. */
  estadisticas: true,
  /** Modo ahorro de batería (Ajustes, Juego): prendido de entrada en celulares. Pila a 20 fps y a media resolución, sin
   * brillos ni partículas, la simulación de la pila al mínimo, interfaz a 4 Hz. Reemplaza al `ahorro` de I11. */
  bateria: esMovil(),
  /** Tasa de refresco de la pila (Ajustes, Juego): 15, 30 o 60 cuadros por segundo. Nunca más de 60 (un 0 guardado, de
   * cuando existía "sin límite", es 60). Solo visual. */
  fps: 60,
  /** Cosméticos de los logros (paletas.ts); si el elegido no está desbloqueado, se usa el primero (logros.ts, elegido). */
  paleta: 'arena',
  efecto: 'normal',
  marco: 'ninguno',
  fondo: 'noche',
  /** Avisos de abajo, uno por uno (Ajustes, Juego, Avisos). Claves en AVISOS. */
  aviso_revelado: true,
  aviso_infinito: true,
  aviso_auto: true,
  aviso_reliquia: true,
  aviso_defectos: true,
  aviso_logros: true,
}

/** Tope de cuadros por segundo de la pila: el elegido, nunca más de 60 aunque la pantalla sea de 120 Hz; 20 con ahorro. */
export const fpsTope = () => Math.min(ajustes.fps || 60, 60, ajustes.bateria ? 20 : 60)
/** ms entre actualizaciones de la interfaz: como mucho 10 por segundo, 4 con ahorro. */
export const uiMs = () => (ajustes.bateria ? 250 : 100)
/** Sin movimiento decorativo: Reducir movimiento, o el modo ahorro (sin rotación, partículas ni efectos pesados). */
export const quieto = () => ajustes.reducirDestellos || ajustes.bateria

export const AVISOS = ['revelado', 'infinito', 'auto', 'reliquia', 'defectos', 'logros'] as const
export type Aviso = (typeof AVISOS)[number]
export const avisoActivo = (k: Aviso) => ajustes[`aviso_${k}`]

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
  $effect(() => void [ajustes.volumen, ajustes.volEfectos, ajustes.volMusica, aplicarVolumen()])
  $effect(() => void document.documentElement.classList.toggle('daltonismo', ajustes.daltonismo))
  $effect(() => void document.documentElement.classList.toggle('reducir-movimiento', ajustes.reducirDestellos))
  $effect(() => void document.documentElement.classList.toggle('ahorro', ajustes.bateria))
  $effect(() => void (document.documentElement.lang = ajustes.idioma))
})
