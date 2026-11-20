// Instalar el juego como app (PWA, public/manifest.webmanifest). Chrome/Edge avisan con beforeinstallprompt y se instala
// desde código; Safari de iOS no tiene forma: se muestra la guía de Compartir → Agregar a inicio. Dentro de un iframe
// (itch.io) no se puede instalar: la tarjeta lleva a la página de GitHub con la partida (src/guardado/pase.ts).

/** La versión instalable. Se puede cambiar al compilar (VITE_URL_APP) para probar el pase con scripts/itch-falso.mjs. */
export const URL_APP: string = import.meta.env.VITE_URL_APP || 'https://feli202.github.io/avalancha/'
/** La tarjeta ya se ofreció en este dispositivo (además va en la partida, `vistos.instalar`). */
const OFRECIDA = 'avalancha.instalar'
/** Recién se cargó una partida de itch.io: ofrecer la instalación aunque ya se haya ofrecido. */
export const TRAIDA = 'avalancha.traida'

type EventoInstalar = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
export const instalar = $state({ abierta: false, evento: null as EventoInstalar | null })

export const enApp = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
export const enIframe = (() => { try { return window.top !== window.self } catch { return true } })()

/** Celular o tablet: instalar se ofrece solo ahí (en la computadora no tiene sentido). iPadOS se presenta como Mac: por la pantalla táctil. */
export const esMovil = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

export type Plataforma = 'itch' | 'prompt' | 'ios' | 'otro'
export function plataforma(): Plataforma {
  if (enIframe) return 'itch'
  const ua = navigator.userAgent
  // iPadOS se presenta como Mac: se lo reconoce por la pantalla táctil.
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  return instalar.evento ? 'prompt' : 'otro'
}

/** Al cargar: el evento llega una vez y hay que guardarlo para el botón. */
export function escucharInstalacion() {
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); instalar.evento = e as EventoInstalar })
  addEventListener('appinstalled', () => { instalar.evento = null; instalar.abierta = false })
}

export async function pedirInstalacion() {
  const e = instalar.evento
  if (!e) return
  await e.prompt()
  const { outcome } = await e.userChoice
  instalar.evento = null // el evento sirve una sola vez
  if (outcome === 'accepted') instalar.abierta = false
}

const leer = (k: string, s: Storage = localStorage) => { try { return s.getItem(k) } catch { return null } }
export const yaOfrecida = () => leer(OFRECIDA) !== null
export function marcarOfrecida() { try { localStorage.setItem(OFRECIDA, '1') } catch {} }
/** true una vez después de cargar una partida de itch.io (sessionStorage, la pone PaseItch antes de recargar). */
export function recienTraida() {
  const t = leer(TRAIDA, sessionStorage) !== null
  try { sessionStorage.removeItem(TRAIDA) } catch {}
  return t
}
