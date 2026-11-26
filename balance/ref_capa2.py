"""Referencia de la Fundicion, la Temperatura, el Horno y las liberaciones para tests/fuego.test.ts, horno.test.ts y liberaciones.test.ts.

Llama a brasas_al_fundir, Fuego.T, Fuego.dens, vidrio_log, costo_horno, Fuego.flujo_x, Fuego.relic_x, efectivo, extra, costo, comprar,
Arena.D y Jugador.v de sim_capa2.py (sin copiarlas) con unos casos y escribe el resultado en tests/fixtures/capa2_sim.json,
capa2_horno.json y capa2_liberaciones.json.

    python balance/ref_capa2.py

Volver a correrlo si cambian las formulas o las constantes de las Brasas, la Temperatura, el Horno o las liberaciones.
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

# --- las liberaciones (fase 6): softcap comun, Desborde, Metamorfosis, Lecho, Densidad ignea, Inercia eterna y Magma
import sim_capa1 as S1
lib = {'softcap': [{'n': n, 'tope': t, 'efectivo': S2.efectivo(n, t), 'extra': S2.extra(n, t)} for t in (5, 10) for n in range(t - 2, t + 6)]}
CAS, MUT = S2.CAS, S2.MUT
lib['desborde'] = [{'L': L, 'tope': CAS['nivel_max'], 'costo': S2.costo(CAS['c0'], CAS['g'], 0, L) + S2.extra(L, CAS['nivel_max'])}
                   for L in range(CAS['nivel_max'] - 2, CAS['nivel_max'] + 6)]
lib['metamorfosis'] = [{'mut': m, 'L': L, 'tope': MUT['nivel_max'], 'costo': S2.costo(MUT[m]['c0'], MUT[m]['g'], 0, L) + S2.extra(L, MUT['nivel_max'])}
                       for m in S2.MUTS for L in range(MUT['nivel_max'] - 1, MUT['nivel_max'] + 5)]
F = S2.Fuego(); F.brasas = 1; F.fuego = {'memoria'}; J = S2.Jugador(F); J.red['sedimentacion'] = 4
comp0 = list(S1.COMP); S2.comprar(F, J, lambda m: None)  # el bot compra Lecho infinito y la lista de umbrales crece
assert 'sedimentacion' in F.fuego
A = S2.Arena(J, None); A.tier = len(S2.COMP0); d17 = A.D()
lib['lecho'] = {'umbrales': S1.COMP[len(S2.COMP0) - 1:len(S2.COMP0) + 8], 'densidad_extra': []}
for j in range(1, 6): A.tier = len(S2.COMP0) + j; lib['lecho']['densidad_extra'].append(A.D() - d17)
S1.COMP[:] = comp0
lib['nodos'] = []
for Btot, red, h in ((1, 0, 0.0), (300, 4, 2.25), (40000, 2, 7.5)):
    F = S2.Fuego(); F.Btot = Btot; F.fuego = {'compactacion', 'inercia', 'presion'}; F.tv = h * 3600; J = S2.Jugador(F)
    J.red['inercia'] = J.red['presion'] = red
    lib['nodos'].append({'Btot': Btot, 'red': red, 'horas': h, 'dens': F.dens(), 'impulso_x': J.v('inercia', 'impulso_x', 1), 'w_x': J.v('presion', 'w_x', 1)})
ruta = os.path.join(os.path.dirname(__file__), '..', 'tests', 'fixtures', 'capa2_liberaciones.json')
with open(ruta, 'w', encoding='utf8') as f: json.dump(lib, f, ensure_ascii=False, indent=1)
print('liberaciones:', lib['lecho']['umbrales'], [round(x, 4) for x in lib['lecho']['densidad_extra']])
for c in lib['nodos']: print(f"  Btot {c['Btot']:6d} red {c['red']} {c['horas']} h: dens {c['dens']:.4f} impulso x{c['impulso_x']:.4f} w x{c['w_x']:.4f}")
