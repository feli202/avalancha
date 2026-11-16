"""Ajuste rapido: aplica cambios a la config en memoria y corre la simulacion."""
import json, sys, sim_capa1 as S
def setp(d, path, v):
    if path.startswith('nodo.'): d, path = S.RED, path[5:]  # nodos de la Red (anillo3_1.2 tiene un punto en el nombre)
    ks = path.split('.')
    for k in ks[:-1]: d = d[int(k)] if isinstance(d, list) else d[k]
    k = ks[-1]
    if isinstance(d, list): d[int(k)] = v
    else: d[k] = v
def run(over, show=True, tmax=24 * 3600, check=15.0):
    for k, v in over.items(): setp(S.L1, k, v)
    st = S.simulate(tmax=tmax, check=check)
    if show:
        S.report(st); last = -1
        for r in st['runs']:
            if r[2] or r[0] - last >= 1.0:
                print(r[:5], r[6], {k: round(v) for k, v in r[5].items() if v > 1}, r[9]); last = r[0]
    return st
if __name__ == '__main__':
    run(json.loads(sys.argv[1]))
