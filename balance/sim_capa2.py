"""Simulador de la Capa 2 (Fuego) de Avalancha, encima de sim_capa1.py (lo importa: la Arena, la Red, los Estratos,
los Defectos, el Relicario y la Escarcha son los de la Capa 1; aca solo se agrega el fuego).

    python sim_capa2.py             -> hitos contra docs/capa2/ritmo_balance.md, desglose por fuente y huecos (jugador que revisa
                                       cada 15 s) y la misma tabla resumida revisando cada 60 s (robustez); ~30 s
    python sim_capa2.py --rapido    -> solo el jugador de 15 s (~15 s)
    python sim_capa2.py --vueltas   -> ademas, una linea por vuelta (--detalle: cada compra de fuego)

Arranca en la partida real de fin de Capa 1 migrada a 1e308 (docs/capa2/partidas/mi_partida_fin_capa1.txt) y funde a
las 0:00. El tiempo cuenta desde ahi. Constantes: config_capa2.json. Todo numero grande en log10.
"""
import base64, json, math, os, sys
import sim_capa1 as S
from sim_capa1 import L0, L1, INF, NEG, l10, addlog, sublog, precio, DEFS

HERE = os.path.dirname(os.path.abspath(__file__))
L2 = json.load(open(os.path.join(HERE, 'config_capa2.json'), encoding='utf-8'))
PARTIDA = os.path.join(HERE, '..', 'docs', 'capa2', 'partidas', 'mi_partida_fin_capa1.txt')
DFX = L1['defectos']; COLS = L0['colores']; CAS = L0['cascada']; MUT = L0['mutaciones']; CAU = L0['caudal']
RF, MOT, HOR, LIB, EE, ESQ, DF2 = (L2[k] for k in ('red_fuego', 'motor', 'horno', 'liberaciones', 'escarcha_eterna', 'esquirlas_fuego', 'defectos'))
COMP0 = list(S.COMP)
TIPOS = L1['relicario']['tipos']
MUTS = ['caudal', 'colores', 'expansion', 'cascada']
ABANDONO = ('abandono_min', 'abandono_revisar_min', 'abandono_ventana_min', 'abandono_meta_max_min')

def extra(n, cap):
    """liberaciones: pasado el tope, el nivel n cuesta paso_extra * j(j+1)/2 ordenes mas (j = niveles pasados)"""
    j = n - cap + 1
    return LIB['paso_extra'] * j * (j + 1) / 2 if j > 0 else 0.0
def efectivo(n, cap): return n if n <= cap else cap + (n - cap) * LIB['rinde']  # y cada nivel pasado rinde la mitad (en log)

class Fuego:
    """Lo permanente de la Capa 2: no se pierde al fundir."""
    def __init__(F):
        F.brasas = 0; F.Btot = 0; F.nF = 0; F.fuego = set()
        F.vidrio = NEG; F.horno = {k: 0 for k in HOR['mejoras']}
        F.esqf = {k: 0 for k in ESQ if not k.startswith('_')}
        F.cargas = {d: 1 for d in DEFS}; F.reintento = {}; F.carga_actual = 1
        F.Tcomp = 0.0; F.compresiones = 0
        F.logX = 0.0; F.esq = NEG; F.escup = None  # Escarcha eterna
        F.reparto = {}; F.tv = 0.0
        F.def_ctot = {}  # Cristales totales con que gano cada Defecto (carga 1) la vuelta anterior
        F.w_pila = MOT['reparto_bot']['pila']; F.sin_estratos = F.sin_escarcha = False  # reparto del bot (se ajusta en cada vuelta)
    def tiene(F, k): return k in F.fuego
    def T(F):
        TP = L2['temperatura']
        return (TP['inicial'] + TP['por_brasa'] * F.Btot ** TP['exp_brasas'] * ESQ['esquirla_fuego']['x'] ** F.esqf['esquirla_fuego']
                + F.Tcomp + HOR['mejoras']['calor_latente']['K'] * F.horno['calor_latente'])
    def dk(F): return (F.T() - L2['temperatura']['inicial']) / 1000  # calor en miles de K
    def dens(F): return 1000 * F.dk() * L2['temperatura']['densidad_por_K'] * (RF['compactacion']['densidad_x'] if F.tiene('compactacion') else 1)
    def abierto(F, sec):
        return {'pila': F.nF >= 1, 'red': F.nF >= 1, 'estratos': F.tiene('estratos'), 'escarcha': F.tiene('frio'), 'relicario': F.tiene('engarces')}[sec]
    def calor(F, sec): return F.reparto.get(sec, 0.0) * F.dk() if F.abierto(sec) else 0.0
    def cargas_hechas(F): return sum(n - 1 for n in F.cargas.values())
    def rec_exp(F, d): return 1 + (DF2['recompensa_exp_carga5'] - 1) * (F.cargas[d] - 1) / 4  # carga 5: recompensa^2,5
    def MB(F):
        c = F.cargas_hechas()
        m = (L2['fundicion']['M_B'] + HOR['mejoras']['crisol']['suma'] * F.horno['crisol']) * DF2['MB_x_por_carga'] ** c
        return m * (1 + RF['cristalografia2']['MB_por_carga'] * c) if F.tiene('cristalografia2') else m
    def flujo_x(F):
        x = (1 + HOR['mejoras']['tiro']['suma'] * F.horno['tiro']) * (1 + MOT['efecto']['estratos'] * F.calor('estratos'))
        return x * (1 + RF['capilaridad']['flujo_por_kK'] * F.dk()) if F.tiene('capilaridad') else x
    def relic_x(F): return (1 + HOR['mejoras']['templado']['suma'] * F.horno['templado']) * (1 + MOT['efecto']['relicario'] * F.calor('relicario'))

class Jugador(S.Player):
    """Las Capas 0 y 1 de una vuelta, con los efectos de fuego."""
    def __init__(s, F):
        super().__init__(); s.F = F; s.last_mut_raw = [0] * 4
        if F.tiene('memoria'): s.red['memoria'] = 4  # Memoria eterna: cada vuelta arranca con Memoria al maximo
        s.done = {d for d in DEFS if F.cargas[d] >= 2}  # las cargas 2-5 son permanentes
        if F.tiene('frio'): s.esc_on = True; s.logX = F.logX; s.esq = F.esq; s.escup = F.escup
        s.retry_at = {d: c - DFX['reintento_cristales_totales_log10'] for d, c in F.def_ctot.items()}  # no lo intenta mucho antes que la vez pasada
    def v(s, node, key, default=0):
        x = super().v(node, key, default); F = s.F
        if key == 'flujo_x' and x: x *= F.flujo_x()
        elif key == 'w_x' and F.tiene('presion'): x *= 1 + RF['presion']['w_por_kK'] * F.dk()  # Magma
        elif key == 'escarcha_g_x' and F.tiene('germen'): x *= 1 + RF['germen']['g_por_kK'] * F.dk()  # Hielo y fuego
        elif key == 'impulso_x' and F.tiene('inercia'): x *= 1 + RF['inercia']['impulso_por_raiz_h'] * math.sqrt(F.tv / 3600)
        return x
    def mods(s, defect):
        m = super().mods(defect); F = s.F; e = F.rec_exp
        if 'vacancia' in s.done: m['hito'] = DFX['vacancia']['recompensa_hito_mult'] ** e('vacancia')
        if 'dislocacion' in s.done: m['ringBase'] = DFX['dislocacion']['recompensa_anillo_mult'] ** e('dislocacion')
        if 'macla' in s.done: m['colorS'] = DFX['macla']['recompensa_color_s_x'] ** e('macla')
        if 'impureza' in s.done: m['cBonus'] += DFX['impureza']['recompensa_cascada_c'] * (e('impureza') - 1)
        if 'frontera' in s.done: m['dAdd'] += DFX['frontera']['recompensa_densidad'] * (e('frontera') - 1)
        m['dAdd'] += F.dens()  # la Temperatura se suma a la Densidad
        if defect != 'vidrio':
            if F.tiene('eco'): m['eco'] += s.v('eco', 'p') * RF['eco']['res_x'] * F.Btot ** RF['eco']['res_exp']  # Resonancia
            R = L1['relicario']; rx = F.relic_x(); eng = 1 if F.tiene('engarces2') else 0
            for t, n in s.equipped:  # Templado, sector Relicario y Engaste de lava sobre lo que ya sumo la Capa 1
                d = rx * (n + 1 + eng) - (n + 1)
                if t == 'cauce': m['cauceX'] += R['cauce_colores_pct_por_nivel'] * d
                if t == 'cascada': m['cBonus'] += R['cascada_c_por_nivel'] * d
                if t == 'mutaciones': m['mutEff'] += R['mutaciones_efecto_por_nivel'] * d
        m['pilaX'] = 1 + MOT['efecto']['pila'] * F.calor('pila')
        return m
    def esc_params(s):
        g, H, m = super().esc_params(); F = s.F
        if 'fatiga' in s.done: g *= DFX['fatiga']['recompensa_escarcha_g_x'] ** (F.rec_exp('fatiga') - 1)
        if 'inclusion' in s.done: H *= DFX['inclusion']['recompensa_escarcha_P_x'] ** (F.rec_exp('inclusion') - 1)
        if F.tiene('frio'):  # Escarcha eterna: no se rompe; pasado el Punto de ruptura (Templanza) crece cada vez mas lento
            if s.logX > H: g *= (H / s.logX) ** EE['softcap_exp']
            H = math.inf
        return g, H, m
    def crys_mult(s, defect):
        x = super().crys_mult(defect)
        if defect == 'vidrio': return x
        if 'vidrio' in s.done: x += DFX['vidrio']['cristales_log10'] * (s.F.rec_exp('vidrio') - 1)
        return x + MOT['efecto']['red'] * s.F.calor('red')
    def slots(s): return super().slots() + (1 if s.F.tiene('engarces2') else 0)

_N308 = {}
def costo(c0, g, s_, L):
    """S.costo_arena para una cuadratica c0 + g L + s L^2 / 2, con el primer nivel pasado 1e308 guardado (costo_arena lo busca en cada llamada)"""
    e = S.quad(c0, g, s_, L); tope = L0['softcap_desde_log10']
    if e <= tope: return precio(e)
    k = (c0, g, s_)
    if k not in _N308:
        lo, hi = 0, 1
        while S.quad(c0, g, s_, hi) <= tope: hi *= 2
        while lo < hi:
            mid = (lo + hi) // 2
            if S.quad(c0, g, s_, mid) > tope: hi = mid
            else: lo = mid + 1
        _N308[k] = lo
    return precio(e + L - _N308[k])

class Arena(S.Arena):
    """La Arena de la Capa 1 con Lecho infinito, Desborde, Metamorfosis, sector Pila y las cargas de Vacancia."""
    Lkr = 0  # niveles comprados de Cascada (Lk es el efectivo, con softcap)
    def __init__(s, P, defect):
        super().__init__(P, defect)
        s.mutRaw = list(P.last_mut_raw) if P.v('sedimentacion', 'conserva_mutaciones') else [0] * 4
        s.mut = [efectivo(r, s.mut_cap()) for r in s.mutRaw]
    def mut_cap(s): return MUT['nivel_max'] + s.m['mutMax']
    def reset_run(s):
        super().reset_run()
        if not s.Lk: s.Lkr = 0
        if hasattr(s, 'mutRaw'):  # una compresion (no la Arena nueva)
            F = s.P.F; F.compresiones += 1; s.dt_comp = L2['dt_compresion_s']  # comprimir es instantaneo: el paso siguiente es corto
            if F.tiene('compactacion2'): F.Tcomp += RF['compactacion2']['K_por_compresion']
    def D(s):
        d = super().D(); j = s.tier - len(COMP0)
        if j <= 0 or s.defect == 'frontera': return d
        x = (LIB['lecho_densidad'] - L0['compresion']['densidad_por_nivel']) * j  # Lecho: las compresiones de mas rinden menos
        return d + (DFX['macla']['densidad_x'] * x if s.defect == 'macla' else x)
    def logV_parts(s):
        p = super().logV_parts(); n = s.P.F.carga_actual
        if s.defect == 'vacancia' and n >= 2:  # carga n: los n colores mas caros no multiplican
            h = L0['hito_colores']
            for i in range(max(0, 4 - n), 3):
                p['colores'] -= s.Lc[i] * l10(COLS[i]['mult_por_nivel']) + (s.Lc[i] // h['cada']) * l10(s.m['hito'])
            p['cauce'] = p['colores'] * s.m['cauceX']
        x = s.m['pilaX']; p['colores'] *= x; p['cauce'] *= x
        return p
    def buy_basic(s, which):
        """Caudal y colores: comprar maximo (como el autocomprador del juego, cantidad 0), no de a 200 como sim_capa1"""
        its = [('f', CAU['c0'], CAU['g'], CAU['s'])] if 'f' in which else []
        for i in range(4):
            if i < s.unl_colors and str(i) in which and not (s.defect == 'vacancia' and i == DFX['vacancia']['color_sin_efecto']):
                c = COLS[i]; its.append((i, c['c0'], c['g'], c['s'] * s.m['colorS']))
        if not its or s.E == NEG: return
        nivel = lambda k: s.Lf if k == 'f' else s.Lc[k]
        tope = s.E - l10(len(its)); gasto = NEG
        for k, c0, g, s_ in its:  # cada uno hasta el nivel que entra en E / n; los ultimos niveles pesan todo el gasto
            L = nivel(k); lo, hi = L, L + 1
            if costo(c0, g, s_, L) > tope: continue
            while costo(c0, g, s_, hi) <= tope: hi = 2 * hi
            while lo < hi:
                mid = (lo + hi) // 2
                if costo(c0, g, s_, mid) > tope: hi = mid
                else: lo = mid + 1
            for l in range(max(L, lo - 4), lo): gasto = addlog(gasto, costo(c0, g, s_, l))
            if k == 'f': s.Lf = lo
            else: s.Lc[k] = lo
        if gasto > NEG: s.E = sublog(s.E, gasto)
        for _ in range(50):  # lo que sobra, lo mas barato primero
            opts = [(k, costo(c0, g, s_, nivel(k))) for k, c0, g, s_ in its]
            k, c = min(opts, key=lambda o: o[1])
            if c > s.E: return
            s.E = sublog(s.E, c)
            if k == 'f': s.Lf += 1
            else: s.Lc[k] += 1
    def buy_casc(s):
        if s.tier < CAS['compresiones_para_desbloquear']: return
        cap = CAS['nivel_max'] + s.m['cascMax']; libre = s.P.F.tiene('cascada_plus')  # Desborde
        for _ in range(5000):
            if s.Lkr >= cap and not libre: break
            c = costo(CAS['c0'], CAS['g'], 0, s.Lkr) + extra(s.Lkr, cap)
            if c > s.E - L1['autocompradores_umbral_log10']: break
            s.E = sublog(s.E, c); s.Lkr += 1
        s.Lk = efectivo(s.Lkr, cap)
    def buy_mut(s):
        if s.defect == 'macla' or s.tier < MUT['compresiones_para_desbloquear'] or s.maxE_ever < MUT['energia_para_desbloquear_log10']: return
        cap = s.mut_cap(); libre = s.P.F.tiene('mutacion_plus')  # Metamorfosis
        for _ in range(5000):
            best = None
            for j, name in enumerate(MUTS):
                if s.mutRaw[j] >= cap and not libre: continue
                c = costo(MUT[name]['c0'], MUT[name]['g'], 0, s.mutRaw[j]) + extra(s.mutRaw[j], cap)
                if c <= s.E - L1['autocompradores_umbral_log10'] and (best is None or c < best[1]): best = (j, c)
            if not best: break
            s.E = sublog(s.E, best[1]); s.mutRaw[best[0]] += 1
        s.mut = [efectivo(r, cap) for r in s.mutRaw]
S.Arena = Arena  # play_arena arma esta Arena

# ------------------------------------------------------------------ Horno, Escarcha eterna, Brasas
def llenos(P):
    sep = P.sep()
    return sum(1 for k in range(P.est_open) if k == 0 or P.s[k] >= P.s[k - 1] - sep - 1e-9)
def vidrio_log(F, P):
    if not F.tiene('estratos') or P.est_open < 8: return NEG
    x = l10(HOR['v0']) + HOR['exp_s8'] * max(0.0, P.s[7]) * (RF['sedimento2']['exp_s8_x'] if F.tiene('sedimento2') else 1)
    x += F.horno['temperatura'] * l10(HOR['mejoras']['temperatura']['x']) + l10(1 + MOT['efecto']['estratos_vidrio'] * F.calor('estratos'))
    if F.tiene('abismo'): x += llenos(P) * l10(RF['abismo']['lleno_x'])
    if F.tiene('eco2'): x += RF['eco2']['vidrio_log_por_eco'] * P.v('eco', 'p') * max(0.0, P.Ctot)
    return x
def esq_log(F, P):
    """Escarcha eterna: Esquirlas/s = M * (logX / d)^q (polinomica: con 10^(logX/40) se disparaba)"""
    if P.logX <= 0: return NEG
    return (l10(EE['M']) + EE['esq_exp'] * l10(P.logX / EE['esq_d']) + F.esqf['geoda'] * l10(ESQ['geoda']['x'])
            + l10(1 + MOT['efecto']['escarcha'] * F.calor('escarcha')))
def brasas_al_fundir(F, P, continuo=False):
    """Brasas = M_B * (log10 C / 308)^q: antes de Fusion del Infinito, M_B; despues escala con el exponente de los Cristales"""
    FU = L2['fundicion']; q = FU['brasas_exp'] * (RF['ruptura2']['brasas_exp_x'] if F.tiene('ruptura2') else 1)
    x = min(300.0, l10(F.MB()) + q * l10(max(1.0, P.Ctot / FU['brasas_desde_log10'])))
    return 10 ** x if continuo else math.floor(10 ** x + 1e-9)
def soft_cristales(lc):
    """con Fusion del Infinito, los Cristales de un Infinito pasado el tope cuentan (lc - tope)^p (si no, el bucle
    Cristales -> Permeabilidad/Presion -> Presion -> Cristales duplica el exponente cada ~3 min)"""
    return INF + (lc - INF) ** L2['fundicion']['cristales_soft_exp'] if lc > INF + 1 else lc

# ------------------------------------------------------------------ bot
def costo_horno(k, L): q = HOR['mejoras'][k]; return precio(q['c0'] + q['paso'] * L + q['cub'] * L ** 3 / 6)
def costo_esqf(k, L): q = ESQ[k]; return precio(q['c0'] + q['paso'] * L)
def siguiente_fuego(F):
    """el bot compra los nodos de fuego en orden de precio (empate: orden de la tabla de la doc)"""
    pend = [k for k in RF if k not in F.fuego]
    return min(pend, key=lambda k: (RF[k]['precio'], list(RF).index(k))) if pend else None
def comprar(F, P, marca):
    while True:  # nodos de fuego con Brasas: el nodo tiene que estar en nv4 en esta vuelta
        k = siguiente_fuego(F)
        if k is None or RF[k]['precio'] > F.brasas or P.red[k] < 4: break
        F.brasas -= RF[k]['precio']; F.fuego.add(k); marca(f'fuego {k}')
        if k == 'sedimentacion':  # Lecho infinito: compresiones sin tope, con escalado propio
            while S.COMP[-1] < 1e7: S.COMP.append(COMP0[-1] * LIB['lecho_umbral_x'] ** (len(S.COMP) - len(COMP0) + 1))
        if k == 'frio': F.logX = P.logX; F.esq = P.esq; F.escup = P.escup  # la Escarcha de esta vuelta queda eterna
    while F.tiene('estratos'):  # Horno con Vidrio, lo mas barato primero
        k = min(HOR['mejoras'], key=lambda k: costo_horno(k, F.horno[k]))
        c = costo_horno(k, F.horno[k])
        if c > F.vidrio: break
        F.vidrio = sublog(F.vidrio, c); F.horno[k] += 1; marca(f'Horno {k} nv{F.horno[k]}')
    comprar_esquirlas(F, P, marca)
def comprar_esquirlas(F, P, marca):
    """Esquirla de fuego y Geoda, con lo que sobra despues de las mejoras de la Escarcha"""
    while True:
        k = min(F.esqf, key=lambda k: costo_esqf(k, F.esqf[k]))
        c = costo_esqf(k, F.esqf[k])
        if c > P.esq: break
        P.esq = sublog(P.esq, c); F.esqf[k] += 1; marca(f'Esquirlas {k} nv{F.esqf[k]}')
    if F.tiene('frio'): F.esq = P.esq
def pendiente(F, P):
    """hay un nodo de fuego pagable esperando que su nodo llegue a nv4 en esta vuelta"""
    k = siguiente_fuego(F)
    return k is not None and RF[k]['precio'] <= F.brasas and P.red[k] < 4
def elegir_defecto(P, F, listo, intentos=0):
    for d in DEFS:  # carga 1 (la de la Capa 1, se rehace en cada vuelta), con las reglas de sim_capa1.simulate
        rq = DFX['requisitos'][d]; node, lvl = rq['red']
        if d in P.done or P.red[node] < lvl: continue
        if P.est_open < rq.get('estratos_abiertos', 0) or P.Ctot < rq.get('cristales_totales_log10', NEG): continue
        prev = DEFS[DEFS.index(d) - 1] if DEFS.index(d) % 4 else None
        if prev and prev not in P.done: continue
        if P.retry_at.get(d, NEG) > P.Ctot: continue
        return d, 1
    if listo and intentos < DF2['bot_cargas_por_vuelta']:  # cargas 2-5: en el tope, antes de fundir, pocas por vuelta; si falla, reintenta con mas Temperatura
        ok = [(F.cargas[d] + 1, i, d) for i, d in enumerate(DEFS) if F.cargas[d] < 5 and F.tiene('defectos' if i < 4 else 'defectos2')
              and d in P.done and F.T() >= F.reintento.get((d, F.cargas[d] + 1), 0)]
        if ok: n, _, d = min(ok); return d, n  # la carga mas baja primero
    return None, 1
def poner_carga(d, n):
    q = DFX[d]; viejo = (dict(q), {k: DFX[k] for k in ABANDONO})
    q['meta_log10'] += DF2['k'][d] * (n - 1)
    for k in ('presion_x', 'densidad_x', 'colores_x'):
        if k in q and d != 'vacancia': q[k] = q[k] ** n
    if d == 'fatiga': q['decada_s'] /= n
    for k in ABANDONO: DFX[k] = DF2[k]
    return viejo
def sacar_carga(d, viejo): DFX[d].clear(); DFX[d].update(viejo[0]); DFX.update(viejo[1])
def reparto_bot(F):
    """Pila se lleva w_pila del calor; el resto, reparto_bot entre los demas sectores abiertos (Estratos nada si la Presion manda)"""
    w = {k: v for k, v in MOT['reparto_bot'].items() if F.abierto(k) and k != 'pila' and not (k == 'estratos' and F.sin_estratos) and not (k == 'escarcha' and F.sin_escarcha)}
    return {'pila': F.w_pila, **{k: (1 - F.w_pila) * v / sum(w.values()) for k, v in w.items()}}
def ajustar_reparto(F, parts):
    """el bot cambia el reparto segun que fuente se le va: si colores (o cauce) pasan del objetivo, menos calor a Pila; si otra
    fuente pasa, mas calor a Pila y nada a su sector (Presion: Estratos; Escarcha: Escarcha)"""
    w = pesos(parts); obj = MOT['bot_objetivo_fuente']; col = max(w['colores'], w['cauce'])
    otra = max((v, k) for k, v in w.items() if k not in ('colores', 'cauce'))
    if col > obj: F.w_pila *= 0.85
    elif otra[0] > obj: F.w_pila = min(1.0, F.w_pila / 0.85 + 0.05)
    F.sin_estratos = otra[1] == 'presion' and otra[0] > obj
    F.sin_escarcha = otra[1] == 'escarcha' and otra[0] > obj
def reliquias(F, P, A):
    if not F.tiene('engarces'):
        for _ in range(P.v('engarces', 'reliquias_por_infinito', 1)): S.pick_relic(P, A)
        return
    for t in TIPOS: P.relic[t] += 1  # Relicario de fuego: una de cada tipo, fusion y engarce solos
    pz = [(t, n) for t in TIPOS for n in P.pieces(t)]
    P.equipped = sorted(pz, key=lambda p: (-p[1], p not in P.equipped, TIPOS.index(p[0])))[:P.slots()]
def estratos_llenos(P):
    if P.red['estratos'] < 1 or P.est_open >= 8: return
    sep = P.sep(); s8 = L2['escalado']['estratos_llenos_s8']
    for k in range(8): P.s[k] = max(P.s[k], s8 + (7 - k) * sep)
    P.est_open = 8
def escalado(F, base):
    E = L2['escalado']; c = E['softcap_fundiciones']
    x = 1 + E['estratos_por_fundicion'] * (F.nF if F.nF <= c else c + math.sqrt(F.nF - c))
    L1['estratos']['permeabilidad']['suma_gamma'] = base[0] * x  # solo la Permeabilidad (velocidad), no la Presion (peso)

def partida_real(F):
    """la partida real de fin de Capa 1, migrada (Cristales en el tope, Permeabilidad y Presion devueltas a 26)"""
    s = open(PARTIDA).read().strip()
    e = json.loads(base64.b64decode(s + '=' * (-len(s) % 4)))['estado']
    P = Jugador(F); P.C = P.Ctot = INF
    P.red.update(e['red']); P.done = set(e['defectos']['completos'])
    es = e['estratos']; P.est_open = es['abiertos']; P.s = list(es['s'])
    P.perm = [min(x, 26) for x in es['perm']]; P.pres = [min(x, 26) for x in es['pres']]
    sc = e['escarcha']; P.esc_on = sc['abierta']; P.logX = sc['logX']; P.esq = l10(sc['esquirlas']); P.escup = dict(sc['mejoras'])
    pz = {p['id']: (p['tipo'], p['nivel']) for p in e['relicario']['piezas']}
    for t, n in pz.values(): P.relic[t] += 3 ** n
    P.equipped = [pz[i] for i in e['relicario']['equipadas'] if i in pz]
    A = Arena(P, None); A.tier = e['compresiones']; A.Lf = e['caudal']; A.Lc = list(e['colores']); A.Lkr = A.Lk = e['cascada']
    A.mutRaw = [e['mutaciones'][k] for k in MUTS]; A.mut = list(A.mutRaw); A.lG = l10(e['granos'])
    return P, A

# ------------------------------------------------------------------ partida
def simular(check=15.0, tmax=14 * 3600, verbose=False):
    M = L1['escarcha']['mejoras']
    base = (L1['estratos']['permeabilidad']['suma_gamma'], L1['estratos']['presion']['suma_w'], {k: M[k]['paso'] for k in M})
    S.COMP[:] = COMP0
    try: return _simular(check, tmax, verbose, base)
    finally:
        L1['estratos']['permeabilidad']['suma_gamma'], L1['estratos']['presion']['suma_w'] = base[:2]
        for k, p in base[2].items(): M[k]['paso'] = p
        S.COMP[:] = COMP0; S.FIN_INF = S.LC_F = None

def _simular(check, tmax, verbose, base):
    F = Fuego(); P, A0 = partida_real(F)
    st = dict(eventos={}, sentidas=[], vueltas=[], fuentes=[], btot=[], inicio=(A0.logV_parts(), A0.D()), F=F)
    reloj = [0.0]; stats = dict(rupturas_escarcha=0)
    def marca(nombre, sentida=True):
        if nombre not in st['eventos']:
            st['eventos'][nombre] = reloj[0]
            if verbose: print(f'{hm(reloj[0])}  {nombre}  (T {F.T():.0f} K, Brasas {F.brasas})')
        if sentida: st['sentidas'].append(reloj[0])
    def log(_, msg, __):  # compras de do_shop: con la Escarcha eterna, sus mejoras son permanentes
        if F.tiene('frio') and msg.startswith('Escarcha'): st['sentidas'].append(reloj[0])
    IGN = L2['temperatura']['ignicion']; REQ = L2['fundicion']['requisito_log10']
    while reloj[0] < tmax:
        # ---- fundir
        b = brasas_al_fundir(F, P); F.brasas += b; F.Btot += b; F.nF += 1
        marca(f'Fundicion {F.nF}'); st['btot'].append((reloj[0], F.Btot))
        if F.T() >= 3000: marca('3000 K', False)
        if F.T() >= IGN: marca('Ignicion', False); break
        # ---- vuelta nueva: Capa 0 desde cero hasta el primer Infinito, despues la Capa 1 hasta 1e308 Cristales
        P = Jugador(F); escalado(F, base); F.reparto = {'pila': 1.0}
        t0 = reloj[0]; tv = 0.0; listo_t = None; primero = True; intentos = 0; quiere_fundir = False; ultima = None
        while True:
            defect, n = elegir_defecto(P, F, quiere_fundir, intentos)
            intentos += n > 1
            viejo = poner_carga(defect, n) if defect else None  # carga 1 igual que en la Capa 1, pero el bot abandona antes
            F.carga_actual = n; F.tv = tv
            # el Infinito se hace apenas da el tope o, pasado un rato, apenas multiplica x10 los Cristales (Infinito automatico del juego)
            x10 = P.Ctot + l10(L1['infinito_auto']['multiplicar_x']); tope = math.inf if F.tiene('ruptura') else REQ
            S.FIN_INF = lambda t, lc, x10=x10, tope=tope: lc >= tope or (t >= L2['bot_infinito_s'] and lc >= x10)
            S.LC_F = soft_cristales if F.tiene('ruptura') else None
            try: dur, A, ok = S.play_arena(P, defect, check, tv, stats)
            finally:
                if viejo: sacar_carga(defect, viejo)
                F.carga_actual = 1
            tv += dur; reloj[0] += dur
            abandono = defect and not ok
            if not abandono: P.ninf += 1
            if not abandono and n == 1 and (ultima is None or not defect or ultima.defect): ultima = A  # para el desglose: mejor una corrida sin Defecto
            P.last_mut = list(A.mut); P.last_mut_raw = list(A.mutRaw); P.last_D = A.D()
            if defect and ok and n > 1:
                F.cargas[defect] = n; bc = DF2['brasas_por_carga'][n]; F.brasas += bc; F.Btot += bc
                marca(f'carga {n} {defect}'); st['btot'].append((reloj[0], F.Btot))
                if all(c == 5 for c in F.cargas.values()): marca('cargas 5 completas', False)
            elif defect and ok: P.done.add(defect); F.def_ctot[defect] = P.Ctot
            elif defect and n > 1: F.reintento[(defect, n)] = F.T() * DF2['reintento_T_x']
            elif defect: P.retry_at[defect] = P.Ctot + DFX['reintento_cristales_totales_log10']
            lc = NEG if abandono else S.infinity_reward(P, A, defect, ok)
            if F.tiene('ruptura'): lc = soft_cristales(lc)
            if lc > NEG:
                P.C = addlog(P.C, lc); P.Ctot = addlog(P.Ctot, lc)
                if not F.tiene('ruptura'): P.C = min(P.C, INF); P.Ctot = min(P.Ctot, INF)  # tope hasta Fusion del Infinito
            if not abandono: reliquias(F, P, A)
            P.last_logG = max(10.0, A.lG)
            vl = vidrio_log(F, P)
            if vl > NEG:
                F.vidrio = addlog(F.vidrio, vl + l10(dur))
                if F.tiene('cristalografia') and not abandono: F.vidrio = addlog(F.vidrio, vl + l10(RF['cristalografia']['vidrio_s_por_infinito']))
            if F.tiene('frio'): F.logX = P.logX; P.esq = addlog(P.esq, esq_log(F, P) + l10(dur))
            for k, p in base[2].items():  # con fuego, las mejoras de la Escarcha encarecen distinto
                L1['escarcha']['mejoras'][k]['paso'] = p * (EE['paso_x'] if F.tiene('frio') else 1)
            S.do_shop(P, tv, log, stats)
            estratos_llenos(P)
            if P.s[7] >= L1['estratos']['meta_1_1_estrato8_log10'] and 'impureza' in P.done and not P.esc_on: P.esc_on = True
            if primero: F.reparto = reparto_bot(F); primero = False
            comprar(F, P, marca)
            if F.T() >= 3000: marca('3000 K', False)
            if F.T() >= IGN: marca('Ignicion', False); break
            # ---- fundir? en el tope, sin nodo de fuego pagable esperando su nv4; antes, las cargas que toquen
            if P.Ctot < REQ: continue
            if listo_t is None: listo_t = tv
            if pendiente(F, P) and tv - listo_t < L2['fundicion']['espera_fuego_max_min'] * 60: continue
            # con Fusion del Infinito, "multiplicar mis Brasas": funde cuando la Fundicion suma x a las Brasas totales (o pasado el tope de tiempo)
            if F.tiene('ruptura') and brasas_al_fundir(F, P) < L2['fundicion']['bot_multiplicar_x'] * F.Btot and tv - listo_t < L2['fundicion']['bot_espera_fusion_min'] * 60: continue
            quiere_fundir = True
            if elegir_defecto(P, F, True, intentos)[1] > 1: continue
            break
        dur = reloj[0] - t0
        st['vueltas'].append((F.nF, t0, dur, brasas_al_fundir(F, P), F.T(), P.ninf, round(P.Ctot)))
        if 'Ignicion' in st['eventos']: break  # la vuelta que corta la Ignicion queda a medias: no cuenta
        A = ultima; A.defect = None; A.m = P.mods(None)  # desglose al fundir: la ultima corrida (sin la regla del Defecto), con los Estratos, el Eco y la Escarcha de ahora
        st['fuentes'].append((reloj[0], F.nF, A.logV_parts(), A.D(), F.dens()))
        ajustar_reparto(F, st['fuentes'][-1][2])
    st['T'] = reloj[0]
    return st

# ------------------------------------------------------------------ salida
def hm(t): m = int(round(t / 60)); return f'{m // 60}:{m % 60:02d}'
def pesos(parts):
    tot = sum(max(0.0, v) for v in parts.values())
    return {k: max(0.0, v) / tot for k, v in parts.items()} if tot > 0 else {}
def chequear(st):
    """(filas de la tabla, peor fuente, hueco maximo, vueltas largas): lo que mira tune_capa2"""
    ev = dict(st['eventos']); tol = L2['tolerancia_h']; filas = []
    vs = st['vueltas'][:-1] if 'Ignicion' in ev else st['vueltas']; i = len(vs)  # "vueltas de 3-5 min": desde cuando todas las vueltas enteras (de la 6.a en adelante) duran 5 min o menos
    while i > 5 and vs[i - 1][2] <= 300: i -= 1
    if i < len(vs): ev['vuelta <= 5 min'] = vs[i][1]
    for nombre, a, b, clave in L2['objetivos']:
        t = ev.get(clave)
        ok = t is not None and (a - tol) * 3600 - 1 <= t <= (b + tol) * 3600 + 1
        filas.append((nombre, a, b, t, ok))
    peor = (0.0, '', 0)
    for _, nf, parts, _, _ in st['fuentes'][1:]:  # desde la segunda vuelta
        for k, w in pesos(parts).items():
            if w > peor[0]: peor = (w, k, nf)
    ts = sorted(st['sentidas']); hueco = max(((b - a, a) for a, b in zip(ts, ts[1:])), default=(0, 0))
    largas = [v for v in st['vueltas'][5:] if v[2] > L2['vuelta_max_min_desde_la_6'] * 60]
    a, b = L2['primeras_vueltas_min']  # 2.a a 4.a vuelta (1:00-2:00 de la tabla): 20-30 min, con un 25 % de margen
    largas += [v for v in st['vueltas'][1:4] if not 0.75 * a * 60 <= v[2] <= 1.25 * b * 60]
    return filas, peor, hueco, largas

def reporte(st, vueltas=False):
    filas, peor, hueco, largas = chequear(st)
    F = st['F']; nf = F.nF
    print(f"Capa 2: {hm(st['T'])} h, {nf} Fundiciones, T {F.T():.0f} K, Brasas totales {F.Btot}")
    print(f"  {'Hito':44s} {'Objetivo':>11s} {'Sim':>6s} {'Dif':>6s}")
    for nombre, a, b, t, ok in filas:
        obj = hm(a * 3600) if a == b else f'{hm(a * 3600)}-{hm(b * 3600)}'
        if t is None: print(f'  {nombre:44s} {obj:>11s} {"--":>6s} {"":>6s}  FUERA'); continue
        d = 0 if a * 3600 <= t <= b * 3600 else (t - a * 3600 if t < a * 3600 else t - b * 3600)
        print(f"  {nombre:44s} {obj:>11s} {hm(t):>6s} {('+' if d >= 0 else '-') + hm(abs(d)):>6s}  {'ok' if ok else 'FUERA'}")
    print(f"  en rango: {sum(f[4] for f in filas)}/{len(filas)}")
    p0, D0 = st['inicio']
    print('  tu partida (fin de Capa 1): D=%.2f ' % D0 + ' '.join(f'{k} {100 * w:.0f}%' for k, w in pesos(p0).items()))
    print(f"  fuente mas pesada al fundir (desde la 2.a vuelta): {peor[1]} {100 * peor[0]:.1f}% (vuelta {peor[2]})  [max {100 * L2['fuente_max']:.0f}%]")
    for t, nfv, parts, D, dT in st['fuentes'][::max(1, len(st['fuentes']) // 8)]:
        print(f'    {hm(t):>6s} F{nfv:<3d} D={D:.2f} (T +{dT:.2f}) ' + ' '.join(f'{k} {100 * w:.0f}%' for k, w in pesos(parts).items()))
    print(f"  hueco maximo entre compras que se sienten: {hueco[0] / 60:.1f} min (desde {hm(hueco[1])})  [max {L2['hueco_max_min']}]")
    print(f"  vueltas 2.a a 4.a: {', '.join(f'{v[2] / 60:.0f}' for v in st['vueltas'][1:4])} min [{L2['primeras_vueltas_min'][0]}-{L2['primeras_vueltas_min'][1]}]; "
          f"de mas de {L2['vuelta_max_min_desde_la_6']} min despues de la 5.a: " + (', '.join(f'F{v[0]} {v[2] / 60:.0f}' for v in st['vueltas'][5:] if v in largas) or 'ninguna'))
    if vueltas:
        for nfv, t0, dur, b, T, ninf, ct in st['vueltas']:
            print(f'    vuelta {nfv:3d}  {hm(t0):>6s}  {dur / 60:6.1f} min  {ninf:5d} Infinitos  C 1e{ct}  -> {b} Brasas  T {T:.0f} K')

if __name__ == '__main__':
    st = simular(verbose='--detalle' in sys.argv)
    reporte(st, vueltas='--vueltas' in sys.argv or '--detalle' in sys.argv)
    if '--rapido' not in sys.argv:
        filas, peor, hueco, _ = chequear(simular(check=60.0))
        print(f"  revisando cada 60 s: en rango {sum(f[4] for f in filas)}/{len(filas)}; fuera: "
              + (', '.join(f'{f[0]} {hm(f[3]) if f[3] else "--"}' for f in filas if not f[4]) or 'nada'))
