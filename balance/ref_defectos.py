"""Referencia de los Defectos para tests/defectos.test.ts.

Arma una Arena fija de sim_capa1.py (sin copiar sus fórmulas) dentro de cada Defecto y con distintas recompensas, y escribe
Arena.D(), la suma de Arena.logV_parts() y Arena.lograte() en tests/fixtures/defectos_sim.json.

    python balance/ref_defectos.py

Volver a correrlo si cambian las reglas o las recompensas de los Defectos.
"""
import json, os
import sim_capa1 as S

# Arena de mitad de la 1.1: los 4 colores (Violeta con hitos), Cascada, Mutaciones, anillos, 3 estratos y Eco.
ARENA = dict(caudal=40, colores=[60, 55, 50, 30], cascada=12, mut=[3, 4, 2, 2], compresiones=17, log_granos=14.37)
RED = {'memoria': 4, 'eco': 2, 'estratos': 2, 'compactacion': 1}
EST = dict(abiertos=3, s=[40.0, 38.0, 30.0], pres=[1, 0, 2])
CTOT = 12.5

def caso(nombre, defecto, hechos):
    P = S.Player()
    P.red.update(RED); P.Ctot = CTOT; P.done = set(hechos)
    P.est_open = EST['abiertos']; P.s[:3] = EST['s']; P.pres[:3] = EST['pres']
    A = S.Arena(P, defecto)
    A.tier = ARENA['compresiones']; A.Lf = ARENA['caudal']; A.Lc = list(ARENA['colores']); A.Lk = ARENA['cascada']
    A.mut = list(ARENA['mut']); A.lG = ARENA['log_granos']
    color3 = S.costo_arena(lambda n: S.quad(S.COLS[3]['c0'], S.COLS[3]['g'], S.COLS[3]['s'] * A.m['colorS'], n), A.Lc[3])
    return dict(nombre=nombre, defecto=defecto or '', hechos=sorted(hechos), D=A.D(), logV=sum(A.logV_parts().values()),
                lograte=A.lograte(), costo_violeta_log10=color3)

TODOS = ['vacancia', 'dislocacion', 'macla', 'impureza']
CASOS = [caso('sin Defecto', None, [])] + [caso(f'en {d}', d, []) for d in TODOS] + \
        [caso(f'con {d} completo', None, [d]) for d in TODOS] + [caso('tres completos, en impureza', 'impureza', TODOS[:3])]

if __name__ == '__main__':
    out = os.path.join(S.HERE, '..', 'tests', 'fixtures', 'defectos_sim.json')
    json.dump(dict(arena=ARENA, red=RED, estratos=EST, ctot_log10=CTOT, casos=CASOS), open(out, 'w'), indent=1)
    for c in CASOS: print(f"{c['nombre']:32s} D {c['D']:.4f}  logV {c['logV']:.3f}  lograte {c['lograte']:.3f}  violeta 1e{c['costo_violeta_log10']}")
