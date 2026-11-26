"""Ajuste de la Capa 2: aplica cambios a las configs en memoria (no toca los archivos) y corre sim_capa2 (~15 s).

    python tune_capa2.py '{"temperatura.por_brasa": 800, "red_fuego.estratos.precio": 2}'          (--vueltas: una linea por vuelta)

Claves con puntos: config_capa2.json; con 'L1.' config_capa1.json; con 'L0.' config.json.
"""
import json, sys, sim_capa2 as C
def setp(path, v):
    d = C.L2
    if path.startswith('L1.'): d, path = C.L1, path[3:]
    elif path.startswith('L0.'): d, path = C.L0, path[3:]
    ks = path.split('.')
    for k in ks[:-1]: d = d[int(k)] if isinstance(d, list) else d[k]
    if isinstance(d, list): d[int(ks[-1])] = v
    else: d[ks[-1]] = v
def run(over, show=True, vueltas=False, check=15.0):
    for k, v in over.items(): setp(k, v)
    st = C.simular(check=check)
    if show: C.reporte(st, vueltas)
    return st
if __name__ == '__main__':
    run(json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}, vueltas='--vueltas' in sys.argv)
