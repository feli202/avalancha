"""Referencia de los Estratos para tests/estratos.test.ts.

Corre el bloque de estratos de play_arena (sim_capa1.py, sin copiarlo) durante 600 s de una Arena sin Energia (asi no comprime ni llega al Infinito) con un estado inicial fijo y
escribe los s_k y la Presión (Player.mods) en tests/fixtures/estratos_sim.json.

    python balance/ref_estratos.py

Volver a correrlo si cambian las fórmulas o las constantes de los estratos.
"""
import json, math, os
import sim_capa1 as S

SEG = 600

class Fin(Exception): pass

def caso(nombre, red, abiertos, s0, perm, pres, caudal_nivel=None):
    P = S.Player()
    P.red.update(red)
    P.est_open = abiertos
    P.s = [x if k < abiertos else S.NEG for k, x in enumerate(s0)]
    P.perm = list(perm); P.pres = list(pres)
    # La Arena del simulador juega sola: se corta a los SEG segundos contando los mismos dt que usa play_arena.
    t = [0.0]
    lograte = S.Arena.lograte; lF = S.Arena.lF
    def cortar(a):
        if t[0] >= SEG: raise Fin()
        t[0] += 0.5 if a.rt < 30 else 1.0 if a.rt < 300 else 2.0
        return S.NEG  # sin Energia no hay Compresiones ni Infinitos (reiniciarian el Impulso de Inercia), como la Arena del test
    S.Arena.lograte = cortar
    # Caudal fijo (para probar f1 fuera del mínimo): log10(Caudal) = nivel × log10(2), como un Caudal de ese nivel.
    if caudal_nivel is not None: S.Arena.lF = lambda a: caudal_nivel * math.log10(2)
    try:
        S.play_arena(P, None, 15.0, 0.0, {'rupturas_escarcha': 0})
    except Fin: pass
    finally: S.Arena.lograte = lograte; S.Arena.lF = lF
    return dict(nombre=nombre, red=red, abiertos=abiertos, s0=[0 if x == S.NEG else x for x in P_s0(s0, abiertos)], perm=perm, pres=pres,
                caudal_nivel=caudal_nivel or 0, segundos=t[0], s=[0 if x == S.NEG else x for x in P.s], presion=P.mods(None)['presion'])

def P_s0(s0, abiertos): return [x if k < abiertos else 0 for k, x in enumerate(s0)]

CASOS = [
    # Recién abiertos, Arena nueva: f1 en su mínimo.
    caso('recien abiertos', {'memoria': 4, 'estratos': 1}, 3, [0] * 8, [0] * 8, [0] * 8),
    # A mitad de la 1.1 (f1 = 60 × log10(2) / 30 = 0,6): flujo de la Red, niveles desparejos y estratos que alcanzan el tope del de arriba.
    caso('a mitad', {'memoria': 4, 'estratos': 4, 'inercia': 3, 'presion': 2}, 5, [40, 30, 27.5, 5, 0, 0, 0, 0],
         [2, 6, 1, 9, 0, 0, 0, 0], [3, 0, 5, 1, 2, 0, 0, 0], caudal_nivel=60),
    # Caudal alto y fijo: f1 = 150 × log10(2) / 30 = 1,5.
    caso('caudal alto', {'memoria': 4, 'estratos': 2}, 8, [60, 50, 45, 40, 30, 20, 10, 0], [1, 0, 2, 0, 3, 0, 4, 0], [0, 1, 0, 2, 0, 3, 0, 4],
         caudal_nivel=150),
    # Nodos de la Red de la correccion 6: Capilaridad (separacion 1,25), Sedimento II (k^1,15), Abismo (llenos x1,4) e Inercia
    # (el Impulso sube los primeros 600 s). Estratos en el tope del de arriba y uno que no.
    caso('anillo 3', {'memoria': 4, 'estratos': 3, 'inercia': 4, 'presion': 1, 'capilaridad': 3, 'sedimento2': 3, 'abismo': 4}, 6,
         [80, 78.75, 77.5, 60, 58.75, 20, 0, 0], [0, 3, 0, 1, 0, 5, 0, 0], [1, 0, 2, 0, 3, 0, 0, 0], caudal_nivel=90),
]

if __name__ == '__main__':
    out = os.path.join(S.HERE, '..', 'tests', 'fixtures', 'estratos_sim.json')
    json.dump(CASOS, open(out, 'w'), indent=1)
    for c in CASOS: print(c['nombre'], c['segundos'], [round(x, 3) for x in c['s']], round(c['presion'], 4))
