"""Referencia de los Cristales para tests/cristales.test.ts.

Llama a infinity_reward de sim_capa1.py (sin copiarla) con cinco casos y escribe el log10 de los Cristales
en tests/fixtures/cristales_sim.json.

    python balance/ref_cristales.py

Volver a correrlo si cambia la fórmula o las constantes de los Cristales.
"""
import json, os
import sim_capa1 as S

class A:  # lo único que infinity_reward lee de la Arena
    def __init__(s, E): s.E = E

CASOS = [  # nombre, red, log10 de la Energía
    ('sin romper', {'cristalografia': 1}, 400.0),
    ('roto', {'ruptura': 2}, 1500.0),
    ('sobre el blando', {'ruptura': 4, 'cristalografia': 4}, 8000.0),
    ('chico', {'ruptura': 1}, 600.0),
    ('ruptura II', {'ruptura': 1, 'ruptura2': 4}, 1000.0),
]

out = []
for nombre, red, E in CASOS:
    P = S.Player(); P.red.update(red)
    out.append({'nombre': nombre, 'red': red, 'E': E, 'lc': S.infinity_reward(P, A(E), None)})
ruta = os.path.join(os.path.dirname(__file__), '..', 'tests', 'fixtures', 'cristales_sim.json')
with open(ruta, 'w', encoding='utf8') as f: json.dump(out, f, ensure_ascii=False, indent=1)
for c in out: print(c['nombre'], round(c['lc'], 4), round(10 ** c['lc'], 2) if c['lc'] < 6 else '')
