// Única puerta de entrada a las constantes de la Capa 1: nadie más importa config_capa1.json.
// Se tipa lo que el código ya usa; cada hito agrega lo suyo.
import crudo from '../../balance/config_capa1.json'
import type { Nodo } from './red'

export interface Config1 {
  /** v1.0: el modo Multiplicar mis Cristales del Infinito automático, por defecto. */
  infinito_auto: { multiplicar_x: number }
  cristales: {
    primer_infinito: number; base_log10: number; Q_ordenes_por_x10: number; beta: number
    blando_desde_log10: number; blando_factor: number
  }
  relicario: {
    tipos: string[]; casilleros: number
    cauce_colores_pct_por_nivel: number; cascada_c_por_nivel: number; mutaciones_efecto_por_nivel: number
  }
  estratos: {
    cantidad: number; gamma_log10_por_s: number; factor_caudal: { div: number; min: number; max: number }
    separacion_log10: number; w_base_por_profundidad: number; abrir_log10: number[]; exponente_presion: number
    s1_inicial: number; meta_1_1_estrato8_log10: number; empuje_por_estrato_inferior: number; impulso_s: number
    permeabilidad: { c0: number; por_profundidad: number; paso: number; cub: number; suma_gamma: number }
    presion: { c0: number; por_profundidad: number; paso: number; cub: number; suma_w: number }
  }
  red: { abre_con_nivel: number; costo_anillo_log10: number[]; paso_nivel_log10: number[]; nodos: Record<string, Nodo>; 'anillo3_1.2': Record<string, Nodo>; prioridad_bot: Record<string, number> }
  /** SPEC_CAPA1 §8: reglas, metas y recompensas de los Defectos. */
  defectos: {
    vacancia: Defecto & { color_sin_efecto: number; recompensa_hito_mult: number }
    dislocacion: Defecto & { cascada_x: number; presion_x: number; recompensa_anillo_mult: number }
    macla: Defecto & { sin_mutaciones: boolean; densidad_x: number; recompensa_color_s_x: number }
    impureza: Defecto & { derrumbes_tope_log10: number; colores_x: number; recompensa_cascada_c: number }
    fatiga: Defecto & { decada_s: number; recompensa_escarcha_g_x: number }
    frontera: Defecto & { recompensa_densidad: number }
    inclusion: Defecto & { recompensa_escarcha_P_x: number }
    vidrio: Defecto & { cristales_log10: number }
    reintento_cristales_totales_log10: number
    abandono_min: number; abandono_revisar_min: number; abandono_ventana_min: number; abandono_meta_max_min: number
    requisitos: Record<string, { red: (string | number)[]; estratos_abiertos?: number; cristales_totales_log10?: number }>
  }
  /** SPEC_CAPA1 §9: la Escarcha. */
  escarcha: {
    g_log10_por_s: number; g_por_presion: number; m: number; punto_ruptura: number; logX_tras_romper: number; esquirlas_por_ruptura_div: number
    mejoras: {
      crecimiento: { c0: number; paso: number; x: number }
      brillo: { c0: number; paso: number; x_m: number }
      umbral: { c0: number; paso: number; x_P: number }
    }
    /** §5: Pulido de una pieza de nivel n, en log10 de Esquirlas. */
    pulido: { c0: number; paso: number }
  }
  /** Memoria: Cascada y Mutaciones automáticas compran solo si cuestan 10^esto veces menos que la Energía. */
  autocompradores_umbral_log10: number
}

type Defecto = { meta_log10: number }

export const CFG1: Config1 = crudo
