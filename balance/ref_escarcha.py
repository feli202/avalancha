"""Referencia de la Escarcha para tests/escarcha.test.ts.

Corre el bloque "escarcha (persiste)" de play_arena (sim_capa1.py, sin copiarlo) durante 1 h de una Arena sin Energia
(asi no comprime ni llega al Infinito: g queda fijo con la Presion del comienzo) con un estado fijo, y escribe logX,
las Esquirlas, las rupturas y g, H y m (Player.esc_params) en tests/fixtures/escarcha_sim.json.

    python balance/ref_escarcha.py

Volver a correrlo si cambian las formulas o las constantes de la Escarcha.
"""
import json, os
import sim_capa1 as S

SEG = 3600
CHECK = 15.0  # el jugador de referencia: rompe a mano en la primera revision despues de llegar al Punto de ruptura

class Fin(Exception): pass

def caso(nombre, red, abiertos, s0, logX, mejoras, done=(), Ctot=0.0):
    P = S.Player()
    P.red.update(red)
    P.est_open = abiertos
    P.s = [x if k < abiertos else S.NEG for k, x in enumerate(s0)]
    P.esc_on = True; P.logX = logX; P.escup.update(mejoras); P.done = set(done); P.Ctot = Ctot; P.C = Ctot
    t = [0.0]
    lograte = S.Arena.lograte
    def cortar(a):
        if t[0] >= SEG: raise Fin()
        t[0] += 0.5 if a.rt < 30 else 1.0 if a.rt < 300 else 2.0
        return S.NEG
    S.Arena.lograte = cortar
    stats = {'rupturas_escarcha': 0}
    try:
        S.play_arena(P, None, CHECK, 0.0, stats)
    except Fin: pass
    finally: S.Arena.lograte = lograte
    g, H, m = P.esc_params()
    return dict(nombre=nombre, red=red, abiertos=abiertos, s0=[x if k < abiertos else 0 for k, x in enumerate(s0)], logX0=logX,
                mejoras=dict(P.escup), done=sorted(done), Ctot=Ctot, segundos=t[0], check=CHECK,
                logX=P.logX, esquirlas=0 if P.esq == S.NEG else round(10 ** P.esq), rupturas=stats['rupturas_escarcha'], g=g, H=H, m=m)

CASOS = [
    # Recien abierta: espesor 0, sin mejoras, la Presion de tres estratos.
    caso('recien abierta', {'estratos': 1}, 3, [40, 30, 27.5, 0, 0, 0, 0, 0], 0.0, {}),
    # A mitad de la 1.2: mejoras, Germen, Eco II y Frio, Fatiga e Inclusion hechos, seis estratos.
    caso('con mejoras', {'estratos': 2, 'presion': 1, 'germen': 2, 'eco2': 3, 'frio': 1}, 6, [80, 70, 65, 60, 50, 40, 0, 0], 120.0,
         {'crecimiento': 5, 'brillo': 3, 'umbral': 4}, done=('fatiga', 'inclusion'), Ctot=150.0),
    # Deshielo nv3: la rompe sola apenas llega al Punto de ruptura y da x4 Esquirlas.
    caso('deshielo', {'estratos': 4, 'germen': 4, 'deshielo': 3}, 8, [120, 110, 100, 90, 80, 70, 60, 50], 10.0,
         {'crecimiento': 2, 'brillo': 1, 'umbral': 1}, Ctot=250.0),
]

if __name__ == '__main__':
    out = os.path.join(S.HERE, '..', 'tests', 'fixtures', 'escarcha_sim.json')
    json.dump(CASOS, open(out, 'w'), indent=1)
    for c in CASOS: print(c['nombre'], c['segundos'], round(c['logX'], 4), c['esquirlas'], c['rupturas'], round(c['g'], 6), round(c['H'], 2), c['m'])
