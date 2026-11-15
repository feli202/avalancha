// Única puerta de entrada a las constantes de la Capa 1: nadie más importa config_capa1.json.
// Se tipa lo que el código ya usa; cada hito agrega lo suyo.
import crudo from '../../balance/config_capa1.json'
import type { Nodo } from './red'

export interface Config1 {
  cristales: { primer_infinito: number; base_log10: number }
  red: { costo_anillo_log10: number[]; paso_nivel_log10: number[]; nodos: Record<string, Nodo>; 'anillo3_1.2': Record<string, Nodo> }
  /** Memoria: Cascada y Mutaciones automáticas compran solo si cuestan 10^esto veces menos que la Energía. */
  autocompradores_umbral_log10: number
}

export const CFG1: Config1 = crudo
