"""Referencia de la Fundicion y la Temperatura para tests/fuego.test.ts.

Llama a brasas_al_fundir, Fuego.T y Fuego.dens de sim_capa2.py (sin copiarlas) con unos casos y escribe el resultado en
tests/fixtures/capa2_sim.json.

    python balance/ref_capa2.py

Volver a correrlo si cambian las formulas o las constantes de las Brasas o la Temperatura.
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
