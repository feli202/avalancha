// Única puerta de entrada a las constantes de la Capa 1: nadie más importa config_capa1.json.
// Se tipa lo que el código ya usa; cada hito agrega lo suyo.
import crudo from '../../balance/config_capa1.json'

export interface Config1 {
  cristales: { primer_infinito: number; base_log10: number }
}

export const CFG1: Config1 = crudo
