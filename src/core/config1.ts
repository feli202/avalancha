// Única puerta de entrada a las constantes de la Capa 1: nadie más importa config_capa1.json.
// Se tipa lo que el código ya usa; cada hito agrega lo suyo.
import crudo from '../../balance/config_capa1.json'
import type { Nodo } from './red'

export interface Config1 {
  cristales: { primer_infinito: number; base_log10: number }
  relicario: {
    tipos: string[]; casilleros: number; espera_eleccion_s: number
    cauce_colores_pct_por_nivel: number; cascada_c_por_nivel: number; mutaciones_efecto_por_nivel: number
  }
  estratos: {
    cantidad: number; gamma_log10_por_s: number; factor_caudal: { div: number; min: number; max: number }
    separacion_log10: number; w_base_por_profundidad: number; abrir_log10: number[]; exponente_presion: number
    s1_inicial: number; empuje_por_estrato_inferior: number; impulso_s: number
    permeabilidad: { c0: number; por_profundidad: number; paso: number; cub: number; suma_gamma: number }
    presion: { c0: number; por_profundidad: number; paso: number; cub: number; suma_w: number }
  }
  red: { costo_anillo_log10: number[]; paso_nivel_log10: number[]; nodos: Record<string, Nodo>; 'anillo3_1.2': Record<string, Nodo> }
  /** Memoria: Cascada y Mutaciones automáticas compran solo si cuestan 10^esto veces menos que la Energía. */
  autocompradores_umbral_log10: number
}

export const CFG1: Config1 = crudo
