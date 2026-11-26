// Worker de la pantalla de los Estratos: corre el embudo (embudo.ts) a 20 pasos por segundo y manda las celdas.
// Vive solo mientras la pantalla está abierta (Estratos.svelte lo crea al entrar y lo termina al salir).
import { BANDAS, Embudo, capacidad } from './embudo'

export interface Entrada {
  abiertos: number
  /** Fracción de cada bandeja que se ve llena (0..1). */
  objetivo: number[]
  /** Granos por paso que caen de la pila (ya con tope). */
  chorro: number
  /** Capa 2: el Horno encendido (el fondo derrite la arena en vidrio). */
  horno: boolean
}
export interface Salida { celdas: Uint8Array; cuentas: number[]; poros: boolean[] }

// La arena que cae de la pila trae sus colores en la proporción de la pila llena: mucho Ámbar (3 granos), poco Violeta (0).
// Hasta que llegan los de la pila llena de verdad (estratosLienzo.ts los cuenta), una aproximación.
let PESOS = [0.08, 0.13, 0.2, 0.59]
const color = () => { let r = Math.random(); for (let k = 3; k > 0; k--) { if ((r -= PESOS[k]) < 0) return k } return 0 }

const e = new Embudo()
let chorro = 0, primero = true

self.onmessage = (m: MessageEvent<Entrada | { pesos: number[] }>) => {
  if ('pesos' in m.data) { PESOS = m.data.pesos; return }
  const d = m.data
  const antes = e.abiertos
  e.objetivo = d.objetivo.map((f) => Math.min(0.95, f))
  chorro = d.chorro
  e.horno = d.horno
  if (d.abiertos !== antes) {
    e.abrir(d.abiertos)
    // Al entrar, cada bandeja ya está en su nivel; la que se acaba de abrir se llena de golpe (bloque 5).
    for (let k = primero ? 0 : antes; k < d.abiertos && k < BANDAS; k++) e.llenar(k, Math.round(e.objetivo[k] * capacidad(k)), color)
    e.contar()
  }
  primero = false
}

setInterval(() => {
  if (!e.abiertos) return
  e.echar(Math.floor(chorro) + (Math.random() < chorro % 1 ? 1 : 0), color)
  e.paso()
  const s: Salida = { celdas: e.celdas.slice(), cuentas: [...e.cuentas], poros: [...e.poros] }
  ;(self as unknown as Worker).postMessage(s, [s.celdas.buffer])
}, 50)
