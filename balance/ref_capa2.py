"""Referencia de la Fundicion, la Temperatura y el Horno para tests/fuego.test.ts y tests/horno.test.ts.

Llama a brasas_al_fundir, Fuego.T, Fuego.dens, vidrio_log, costo_horno, Fuego.flujo_x y Fuego.relic_x de sim_capa2.py (sin
copiarlas) con unos casos y escribe el resultado en tests/fixtures/capa2_sim.json y capa2_horno.json.

    python balance/ref_capa2.py

Volver a correrlo si cambian las formulas o las constantes de las Brasas, la Temperatura o el Horno.
"""
import json, os
import sim_capa2 as S2

class P:  # lo unico que brasas_al_fundir lee del jugador: log10 de los Cristales totales
    def __init__(s, Ctot): s.Ctot = Ctot

CASOS = [  # nombre, log10 de los Cristales totales, Brasas totales
    ('primera Fundicion', S2.INF, 0),
    ('una Brasa', S2.INF, 1),
    ('600 Brasas (~3.000 K)', S2.INF, 600),
    ('Ignicion (1e5 Brasas)', S2.INF, 100000),
    ('pasado el tope', 400.0, 50),
    ('muy pasado el tope', 2000.0, 12345),
    ('por debajo de 308', 100.0, 3),
]

out = []
for nombre, Ctot, Btot in CASOS:
    F = S2.Fuego(); F.Btot = Btot
    out.append({'nombre': nombre, 'Ctot': Ctot, 'Btot': Btot, 'brasas': S2.brasas_al_fundir(F, P(Ctot)), 'T': F.T(), 'dens': F.dens()})
ruta = os.path.join(os.path.dirname(__file__), '..', 'tests', 'fixtures', 'capa2_sim.json')
with open(ruta, 'w', encoding='utf8') as f: json.dump(out, f, ensure_ascii=False, indent=1)
for c in out: print(f"{c['nombre']:24s} Brasas {c['brasas']:6d}  T {c['T']:8.2f} K  dens {c['dens']:.4f}")

# --- el Horno (fase 5): mismo estado => mismo Vidrio/s, costos, M_B, Temperatura, flujo y reliquias
class PH:  # lo que vidrio_log lee del jugador: los estratos
    def __init__(s, s8): s.s = [0.0] * 7 + [s8]; s.est_open = 8
HORNO = [  # nombre, s_8, Brasas totales, parte de Estratos (el resto a Pila), niveles del Horno
    ('recien encendido', 290.9, 1, 0.0, {}),
    ('primer nivel', 300.0, 5, 0.1, {'temperatura': 1}),
    ('mitad de capa', 640.0, 300, 0.25, {'temperatura': 6, 'tiro': 3, 'crisol': 2, 'calor_latente': 2, 'templado': 1}),
    ('tarde', 1500.0, 40000, 0.6, {'temperatura': 12, 'tiro': 7, 'crisol': 4, 'calor_latente': 5, 'templado': 4}),
]
horno = []
for nombre, s8, Btot, pe, niveles in HORNO:
    F = S2.Fuego(); F.Btot = Btot; F.nF = 1; F.fuego = {'estratos'}; F.reparto = {'pila': 1 - pe, 'estratos': pe}
    F.horno.update(niveles)
    horno.append({'nombre': nombre, 's8': s8, 'Btot': Btot, 'estratos': pe, 'horno': dict(F.horno), 'vidrio_log': S2.vidrio_log(F, PH(s8)),
                  'T': F.T(), 'MB': F.MB(), 'flujo_x': F.flujo_x(), 'relic_x': F.relic_x(),
                  'costos': {k: S2.costo_horno(k, F.horno[k]) for k in F.horno}})
ruta = os.path.join(os.path.dirname(__file__), '..', 'tests', 'fixtures', 'capa2_horno.json')
with open(ruta, 'w', encoding='utf8') as f: json.dump(horno, f, ensure_ascii=False, indent=1)
for c in horno: print(f"{c['nombre']:18s} log10 Vidrio/s {c['vidrio_log']:9.4f}  T {c['T']:8.2f}  M_B {c['MB']}  flujo x{c['flujo_x']:.4f}")
