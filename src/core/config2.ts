// Única puerta de entrada a las constantes de la Capa 2: nadie más importa config_capa2.json.
// Se tipa lo que el código ya usa; cada fase agrega lo suyo.
import crudo from '../../balance/config_capa2.json'

export interface Config2 {
  fundicion: { requisito_log10: number; brasas_desde_log10: number; M_B: number; brasas_exp: number }
  temperatura: { inicial: number; ignicion: number; por_brasa: number; exp_brasas: number; densidad_por_K: number }
  /** El nivel de fuego de cada nodo de la Red (las claves son las de NODOS). */
  red_fuego: Record<string, { precio: number }> & {
    memoria: { autocompradores_x: number }
    eco: { res_x: number; res_exp: number }
  }
  liberaciones: { lecho_densidad: number; lecho_umbral_x: number }
}

export const CFG2: Config2 = crudo
