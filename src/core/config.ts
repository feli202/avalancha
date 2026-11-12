// Única puerta de entrada a las constantes de balance: nadie más importa config.json.
import crudo from '../../balance/config.json'

export type MutId = 'caudal' | 'colores' | 'expansion' | 'cascada'
export const MUTACIONES: MutId[] = ['caudal', 'colores', 'expansion', 'cascada']

/** Costo en log10: c0 + g·n (+ s·n²/2 si hay s). */
interface Curva { c0: number; g: number }

export interface Config {
  K_derrumbes_por_grano: number
  infinito_log10: number
  caudal: Curva & { s: number; granos_base: number; mult_por_nivel: number }
  colores: (Curva & { s: number; id: string; mult_por_nivel: number; desbloqueo_log10: number })[]
  hito_colores: { cada: number; mult: number }
  anillos: { granos_primer_anillo: number; mult_por_anillo: number }
  cascada: Curva & {
    compresiones_para_desbloquear: number; c_por_nivel: number; nivel_max: number
    exp_G: number; exp_penal: number
  }
  compresion: { umbrales_log10: number[]; densidad_por_nivel: number }
  mutaciones: {
    compresiones_para_desbloquear: number; energia_para_desbloquear_log10: number; nivel_max: number
  } & Record<MutId, Curva & { por_nivel: number }>
  /** Compresiones necesarias para cada autocomprador (caudal, id de color, compresion_auto). */
  autocompradores: Record<string, number>
  punado: { granos: number; max_por_segundo: number }
  objetivo_minutos: Record<string, number>
}

export const CFG: Config = crudo
