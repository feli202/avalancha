// Única puerta de entrada a las constantes de balance: nadie más importa config.json.
import crudo from '../../balance/config.json'

export type MutId = 'caudal' | 'colores' | 'expansion' | 'cascada'
export const MUTACIONES: MutId[] = ['caudal', 'colores', 'expansion', 'cascada']

/** Costo en log10: c0 + g·n (+ s·n²/2 si hay s). */
interface Curva { c0: number; g: number }

export interface Config {
  K_derrumbes_por_grano: number
  granos_iniciales: number
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
  /** SPEC 5: Energía máxima a la que aparece cada parte de la interfaz. */
  revelado: { tienda: number; ambar: number; compresion_log10: number }
  punado: { granos: number; max_por_segundo: number }
  fuera_de_linea: { paso_s: number; max_pasos: number; tope_horas: number }
  /** SPEC 7: umbrales de los logros (sin efecto en el balance). */
  logros: {
    granos_pila: number; avalancha: number; anillo: number; densidad: number; anillo_grande: number
    avalancha_record: number; infinito_rapido_horas: number
    alud: number; anillo_medio: number; compresiones: number; corrida_rapida_min: number; densidad_alta: number
  }
  /** Logros secretos (cosméticos): umbrales, nombre para Steam y recompensa [tipo, id]. Los lee src/ui/secretos.ts. */
  secretos: Record<string, { api: string; recompensa: string[] } & Record<string, unknown>>
  /** Fondos de la pila en orden: id -> logro que lo da (null = de inicio). */
  fondos: Record<string, string | null>
  objetivo_minutos: Record<string, number>
}

export const CFG: Config = crudo
