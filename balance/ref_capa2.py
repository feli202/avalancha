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

# --- la Escarcha eterna y el Relicario de fuego (fase 7): g con Hielo y fuego y el freno pasado P, P, m, Esquirlas/s, costos con
# el paso x3,86 y el efecto de las reliquias engarzadas con Templado, el sector Relicario y Engaste de lava
ESC = [  # nombre, logX, mejoras, Brasas totales, parte de Escarcha, parte de Relicario, fuegos, Templado
    ('recien eterna', 120.0, {'crecimiento': 8, 'brillo': 6, 'umbral': 2}, 9, 0.0, 0.0, {'frio'}, 0),
    ('pasado P', 400.0, {'crecimiento': 12, 'brillo': 9, 'umbral': 3}, 60, 0.1, 0.0, {'frio', 'germen'}, 1),
    ('partida real', 10195.0, {'crecimiento': 30, 'brillo': 20, 'umbral': 10}, 300, 0.2, 0.1, {'frio', 'germen', 'engarces'}, 3),
    ('tarde', 25000.0, {'crecimiento': 40, 'brillo': 30, 'umbral': 14}, 40000, 0.05, 0.3, {'frio', 'germen', 'engarces', 'engarces2'}, 6),
]
ME = S1.L1['escarcha']['mejoras']; paso0 = {k: ME[k]['paso'] for k in ME}
esc = []
for nombre, logX, up, Btot, pe, pr, fuegos, templado in ESC:
    F = S2.Fuego(); F.Btot = Btot; F.nF = 1; F.fuego = set(fuegos); F.horno['templado'] = templado
    F.reparto = {'pila': 1 - pe - pr, 'escarcha': pe, 'relicario': pr}
    J = S2.Jugador(F); J.logX = logX; J.escup = dict(up)
    g, H, m = J.esc_params()
    for k in ME: ME[k]['paso'] = paso0[k] * S2.EE['paso_x']
    costos = {k: S1.precio(ME[k]['c0'] + ME[k]['paso'] * up[k]) for k in ME}
    for k in ME: ME[k]['paso'] = paso0[k]
    J.equipped = [('cascada', 2), ('cauce', 0)]
    m2 = J.mods(None)  # sin Defectos completos, cBonus y cauceX son solo las reliquias
    esc.append({'nombre': nombre, 'logX': logX, 'mejoras': up, 'Btot': Btot, 'escarcha': pe, 'relicario': pr, 'fuegos': sorted(fuegos), 'templado': templado,
                'g': g, 'P': S2.S.Player.esc_params(J)[1], 'm': m, 'esq_log': S2.esq_log(F, J), 'costos': costos,
                'slots': J.slots(), 'cBonus': m2['cBonus'], 'cauceX': m2['cauceX']})
ruta = os.path.join(os.path.dirname(__file__), '..', 'tests', 'fixtures', 'capa2_escarcha.json')
with open(ruta, 'w', encoding='utf8') as f: json.dump(esc, f, ensure_ascii=False, indent=1)
for c in esc: print(f"{c['nombre']:14s} g {c['g']:.6g} P {c['P']:.4f} m {c['m']:.4f} log10 Esq/s {c['esq_log']:.4f} costos {c['costos']} cBonus {c['cBonus']:.4f}")

# --- Fusion del Infinito y escalado (fase 9): freno de los Cristales, Brasas con Fusion, Temperatura con Esquirla de fuego y
# Compresion termica, Esquirlas/s con Geoda, costos de Esquirla de fuego y Geoda, Permeabilidad x(1 + 0,3 F) con softcap y los
# nodos Conveccion, Sedimento fundido, Abismo ardiente y Eco del Horno
esc9 = {'freno': [{'lc': lc, 'freno': S2.soft_cristales(lc)} for lc in (100.0, S2.INF, S2.INF + 0.5, S2.INF + 1.5, 400.0, 1000.0, 1e5, 1e6)]}
esc9['brasas'] = []
for Ctot, crisol, cargas, fuegos in ((S2.INF, 0, 0, set()), (450.0, 1, 0, set()), (700.0, 2, 6, {'cristalografia2'}), (700.0, 2, 6, {'cristalografia2', 'ruptura2'}),
                                     (1000.0, 4, 28, {'cristalografia2', 'ruptura2'}), (1e5, 4, 28, {'ruptura2'}), (1e6, 4, 32, {'cristalografia2', 'ruptura2'})):
    F = S2.Fuego(); F.horno['crisol'] = crisol; F.fuego = set(fuegos)
    for d in list(F.cargas)[:cargas // 4]: F.cargas[d] = 5
    esc9['brasas'].append({'Ctot': Ctot, 'crisol': crisol, 'cargas': F.cargas_hechas(), 'fuegos': sorted(fuegos), 'brasas': S2.brasas_al_fundir(F, P(Ctot))})
esc9['T'] = []
for Btot, esqf, comps, cl in ((1, 0, 0, 0), (300, 4, 0, 1), (5000, 20, 1200, 3), (100000, 60, 40000, 6)):
    F = S2.Fuego(); F.Btot = Btot; F.esqf['esquirla_fuego'] = esqf; F.horno['calor_latente'] = cl
    for _ in range(comps): F.Tcomp += S2.RF['compactacion2']['K_por_compresion']  # como reset_run con Compresion termica
    esc9['T'].append({'Btot': Btot, 'esquirla_fuego': esqf, 'compresiones': comps, 'calor_latente': cl, 'T': F.T()})
esc9['esquirlas'] = []
for logX, geoda in ((120.0, 0), (400.0, 3), (10195.0, 12)):
    F = S2.Fuego(); F.nF = 1; F.fuego = {'frio'}; F.esqf['geoda'] = geoda; J = S2.Jugador(F); J.logX = logX
    esc9['esquirlas'].append({'logX': logX, 'geoda': geoda, 'esq_log': S2.esq_log(F, J)})
esc9['costos'] = {k: [S2.costo_esqf(k, L) for L in range(6)] for k in ('esquirla_fuego', 'geoda')}
perm = S1.L1['estratos']['permeabilidad']; g0 = perm['suma_gamma']; base = (g0, S1.L1['estratos']['presion']['suma_w'], {})
esc9['escalado'] = []
for nF in (0, 1, 2, 5, 20, 21, 24, 45, 100):
    F = S2.Fuego(); F.nF = nF; S2.escalado(F, base); esc9['escalado'].append({'F': nF, 'x': perm['suma_gamma'] / g0})
perm['suma_gamma'] = g0
esc9['vidrio'] = []
for nombre, s8, llenos_, eco, Ctot, Btot, fuegos in (('Sedimento fundido', 640.0, 8, 0, 400.0, 300, {'estratos', 'sedimento2'}),
                                                     ('Abismo, 5 llenos', 900.0, 5, 0, 500.0, 2000, {'estratos', 'abismo'}),
                                                     ('Eco del Horno', 900.0, 8, 4, 700.0, 4000, {'estratos', 'eco2'}),
                                                     ('los tres', 1500.0, 6, 4, 1000.0, 40000, {'estratos', 'sedimento2', 'abismo', 'eco2', 'capilaridad'})):
    F = S2.Fuego(); F.Btot = Btot; F.nF = 1; F.fuego = set(fuegos); F.reparto = {'pila': 1.0}
    J = S2.Jugador(F); J.red['eco'] = eco; J.est_open = 8; J.Ctot = Ctot
    sep = J.sep(); J.s = [s8 + (7 - k) * sep for k in range(8)]
    for k in range(llenos_, 8): J.s[k] -= 3 * sep  # los de abajo, a medio llenar (los primeros `llenos_` quedan en su tope)
    esc9['vidrio'].append({'nombre': nombre, 's': J.s, 'eco': eco, 'Ctot': Ctot, 'Btot': Btot, 'fuegos': sorted(fuegos), 'llenos': S2.llenos(J),
                           'vidrio_log': S2.vidrio_log(F, J), 'flujo_x': F.flujo_x()})
ruta = os.path.join(os.path.dirname(__file__), '..', 'tests', 'fixtures', 'capa2_escalado.json')
with open(ruta, 'w', encoding='utf8') as f: json.dump(esc9, f, ensure_ascii=False, indent=1)
print('escalado:', [round(c['x'], 4) for c in esc9['escalado']], 'brasas:', [c['brasas'] for c in esc9['brasas']])
for c in esc9['vidrio']: print(f"  {c['nombre']:18s} llenos {c['llenos']} log10 Vidrio/s {c['vidrio_log']:.4f} flujo x{c['flujo_x']:.4f}")
