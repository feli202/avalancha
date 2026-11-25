"""Simulador de referencia de la Capa 1 (Cristalizacion) de Avalancha.

Juega la Arena (Capa 0) y la Cristalizacion juntas desde el primer Infinito, con las formulas
de SPEC_CAPA1.md y las constantes de config.json (Capa 0) + config_capa1.json (Capa 1).

    python3 sim_capa1.py              -> hitos y tiempos del jugador de referencia (revisa cada 15 s)
    python3 sim_capa1.py --robustez   -> mismo juego revisando cada 15 s / 60 s / 5 min
    python3 sim_capa1.py --detalle    -> ademas, cada compra de la Capa 1

El tiempo cuenta desde el primer Infinito (la Capa 0 completa dura ~3 h y no cambia).
Todo numero grande vive en log10.
"""
import collections, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
def _load(name):
    alt = os.path.join(HERE, 'config_capa0_snapshot.json') if name == 'config.json' else None  # copia con la que se calibro
    for p in (os.path.join(HERE, name), os.path.join(HERE, '..', '..', 'avalancha-capa0', 'balance', name), alt):
        if p is None: continue
        if os.path.exists(p): return json.load(open(p))
    raise FileNotFoundError(name)
L0 = _load('config.json')
L1 = _load('config_capa1.json')
INF = L0['infinito_log10']
NEG = -math.inf

def l10(x): return math.log10(x) if x > 0 else NEG
def addlog(a, b):
    if a < b: a, b = b, a
    return a if b == NEG or b < a - 30 else a + math.log10(1 + 10 ** (b - a))
def sublog(a, b): return a + math.log10(1 - 10 ** (b - a)) if b < a - 1e-12 else NEG
def precio(x): return math.floor(x + 0.5 + 1e-9)  # todo precio es 1eN con N entero (al mas cercano)
def costo_arena(f, L):
    """mejoras de la Arena: exp_normal(L) + max(0, L - L308), L308 = primer nivel cuyo exp_normal pasa de 1e308"""
    e = f(L); S = L0['softcap_desde_log10']
    if e <= S: return precio(e)
    n = L
    lo = 0
    while lo < n:  # biseccion: primer nivel cuyo exponente normal pasa del tope (f es creciente)
        mid = (lo + n) // 2
        if f(mid) > S: n = mid
        else: lo = mid + 1
    return precio(e + L - n)

# ------------------------------------------------------------------ Red
RED = dict(L1['red']['nodos']); RED.update(L1['red']['anillo3_1.2'])
RING3 = set(L1['red']['anillo3_1.2'])
POS = {k: tuple(v['pos']) for k, v in RED.items()}
BYPOS = {v: k for k, v in POS.items()}
def ring(k): x, y = POS[k]; return abs(x) + abs(y)
def red_cost(k, lvl):
    if 'costos_log10' in RED[k]: return precio(RED[k]['costos_log10'][lvl])  # v1.0: costo por nivel explicito (Defectos)
    r = ring(k); base = RED[k].get('costo_base_log10', L1['red']['costo_anillo_log10'][r])
    return precio(base + RED[k].get('paso_log10', L1['red']['paso_nivel_log10'][r]) * lvl)
DFX = L1['defectos']
DEFS = [k for k, v in DFX.items() if isinstance(v, dict) and 'meta_log10' in v]
DEF_REQ = {'vacancia': ('defectos', 1), 'dislocacion': ('defectos', 2), 'macla': ('defectos', 3), 'impureza': ('defectos', 4),
           'fatiga': ('defectos2', 1), 'frontera': ('defectos2', 2), 'inclusion': ('defectos2', 3), 'vidrio': ('defectos2', 4)}

class Player:
    def __init__(s, cfg_over=None):
        s.C = NEG; s.Ctot = NEG; s.ninf = 0
        s.red = {k: 0 for k in RED}
        s.relic = {t: 0 for t in L1['relicario']['tipos']}; s.equipped = []
        s.est_open = 0; s.perm = [0] * 8; s.pres = [0] * 8; s.s = [NEG] * 8
        s.done = set(); s.retry_at = {}
        s.esc_on = False; s.logX = 0.0; s.esq = NEG; s.escup = {k: 0 for k in L1['escarcha']['mejoras']}; s.polish = {t: 0 for t in s.relic}
        s.last_D = 1.0
        s.last_logG = 10.0; s.last_mut = [0, 0, 0, 0]; s.last_pres = 0.0

    def v(s, node, key, default=0):
        lv = s.red[node]
        return RED[node][key][lv - 1] if lv > 0 and key in RED[node] else default
    def open_nodes(s):
        out = []
        for k in RED:
            if s.red[k] >= 4: continue
            if k in RING3 and not s.esc_on: continue
            if k == 'memoria': out.append(k); continue
            if any(s.red[n] < lv for n, lv in RED[k].get('requiere', {}).items()): continue  # Estratos: solo con Ruptura nv1
            x, y = POS[k]
            nb = [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
            abre = L1['red'].get('abre_con_nivel', 4)  # un vecino mas cercano al centro en este nivel abre el nodo
            if any(BYPOS.get(p) and s.red[BYPOS[p]] >= abre and ring(BYPOS[p]) < ring(k) for p in nb): out.append(k)
        return out
    def relic_level(s, t):
        c = s.relic[t] + s.polish[t]
        return int(math.floor(math.log(c, 3) + 1e-9)) if c >= 1 else -1
    def pieces(s, t, extra=0):
        """inventario fusionado: 3 iguales -> 1 del color siguiente, o sea los digitos en base 3 del conteo"""
        c = s.relic[t] + s.polish[t] + extra; out = []; n = 0
        while c: out += [n] * (c % 3); c //= 3; n += 1
        return out
    def sep(s): return s.v('capilaridad', 'separacion', L1['estratos']['separacion_log10'])
    def presion(s):
        if not s.v('estratos', 'flujo_x', 0): return 0.0
        E = L1['estratos']; wx = s.v('presion', 'w_x', 1); e = s.v('sedimento2', 'exp_profundidad', 1)
        ab = s.v('abismo', 'lleno_x', 1); sep = s.sep(); pr = 0.0
        for k in range(s.est_open):
            lleno = k == 0 or s.s[k] >= s.s[k - 1] - sep - 1e-9  # el primero no tiene tope: cuenta como lleno
            w = E['w_base_por_profundidad'] * (k + 1) ** e * wx * (1 + E['presion']['suma_w'] * s.pres[k]) * (ab if lleno else 1)
            pr += w * max(0.0, s.s[k]) ** E['exponente_presion']
        return pr
    def slots(s):
        return max(1, s.v('engarces', 'espacios', 1), s.v('engarces2', 'espacios', 1))

    # -------------------------------------------------- modificadores para la Arena
    def mods(s, defect):
        R = L1['relicario']; noRed = False  # vidrio: sin Relicario, Eco ni Escarcha (la Red sigue)
        m = dict(extraV=0.0, dAdd=0.0, cBonus=0.0, cascMax=0, mutMax=0, mutEff=0.0, keep=0, hito=4.0, ringBase=1.10,
                 colorS=1.0, presion=0.0, eco=0.0, cauce=0.0, cauceX=0.0)
        if 'vacancia' in s.done: m['hito'] = DFX['vacancia']['recompensa_hito_mult']
        if 'dislocacion' in s.done: m['ringBase'] = DFX['dislocacion']['recompensa_anillo_mult']
        if 'macla' in s.done: m['colorS'] = DFX['macla']['recompensa_color_s_x']
        if 'impureza' in s.done: m['cBonus'] += DFX['impureza']['recompensa_cascada_c']
        if 'frontera' in s.done: m['dAdd'] += DFX['frontera']['recompensa_densidad']
        if not noRed:
            m['dAdd'] += s.v('compactacion', 'densidad')
            m['cascMax'] = s.v('cascada_plus', 'nivel_max_extra'); m['mutMax'] = s.v('mutacion_plus', 'nivel_max_extra')
            m['keep'] = s.v('memoria', 'conservar_compresiones')
            p = s.v('eco', 'p')
            m['eco'] = 0.0 if defect == 'vidrio' else p * max(0.0, s.Ctot)
            m['presion'] = s.presion(); s.last_pres = m['presion']
        if defect != 'vidrio':
            for t, n in s.equipped:  # piezas equipadas (tipo, nivel); dos del mismo tipo se suman
                if t == 'cauce': m['cauceX'] += R['cauce_colores_pct_por_nivel'] * (n + 1)
                if t == 'cascada': m['cBonus'] += R['cascada_c_por_nivel'] * (n + 1)
                if t == 'mutaciones': m['mutEff'] += R['mutaciones_efecto_por_nivel'] * (n + 1)
        m['extraV'] = m['presion'] + m['eco'] + m['cauce']
        return m
    def crys_mult(s, defect):
        if defect == 'vidrio': return 0.0
        x = s.v('ruptura', 'cristales_log10') + s.v('cristalografia', 'cristales_log10') + s.v('cristalografia2', 'cristales_log10_por_defecto') * len(s.done)
        if 'vidrio' in s.done: x += L1['defectos']['vidrio']['cristales_log10']
        return x
    def Q(s): return L1['cristales']['Q_ordenes_por_x10'] - s.v('ruptura2', 'Q_resta')
    def broken(s): return s.red['ruptura'] >= 1
    def esc_params(s):
        E = L1['escarcha']; up = s.escup; M = E['mejoras']
        g = E['g_log10_por_s'] * (1 + E.get('g_por_presion', 0.01) * s.last_pres) * M['crecimiento']['x'] ** up['crecimiento'] * s.v('germen', 'escarcha_g_x', 1) * (DFX['fatiga']['recompensa_escarcha_g_x'] if 'fatiga' in s.done else 1) * (1 + s.v('eco2', 'escarcha_eco') * max(0.0, s.Ctot))
        H = E['punto_ruptura'] * M['umbral']['x_P'] ** up['umbral'] * s.v('frio', 'escarcha_P_x', 1) * (DFX['inclusion']['recompensa_escarcha_P_x'] if 'inclusion' in s.done else 1)  # H = Punto de ruptura
        m = E['m'] * M['brillo']['x_m'] ** up['brillo']
        return g, H, m

# ------------------------------------------------------------------ Arena
COLS = L0['colores']; CAU = L0['caudal']; CAS = L0['cascada']; MUT = L0['mutaciones']; COMP = L0['compresion']['umbrales_log10']
def quad(c0, g, s_, L): return c0 + g * L + s_ * L * L / 2

class Arena:
    def __init__(s, P, defect):
        s.P = P; s.defect = defect; s.m = P.mods(defect)
        s.tier = min(s.m['keep'], len(COMP))
        s.mut = list(P.last_mut) if P.v('sedimentacion', 'conserva_mutaciones') else [0, 0, 0, 0]  # caudal colores expansion cascada; Sedimentacion nv4: el Infinito no las reinicia
        s.Lf = 0; s.Lc = [0, 0, 0, 0]; s.Lk = 0
        s.reset_run(); s.maxE_ever = NEG
        s.unl_colors = 1; s.plateau_E = NEG; s.plateau_t = 0.0
    def reset_run(s):
        s.E = NEG; s.lG = NEG; s.rt = 0.0; s.maxE = NEG
        # Sedimentacion: la Compresion no reinicia el Caudal (nv1), los colores (nv2) ni la Cascada (nv3); el Infinito arma una Arena nueva
        P = s.P
        if not P.v('sedimentacion', 'conserva_caudal'): s.Lf = 0
        if not P.v('sedimentacion', 'conserva_colores'): s.Lc = [0, 0, 0, 0]
        if not P.v('sedimentacion', 'conserva_cascada'): s.Lk = 0
    def D(s):
        if s.defect == 'frontera': return 1.0
        d = 1 + L0['compresion']['densidad_por_nivel'] * s.tier + s.m['dAdd'] + s.P.v('compactacion2', 'densidad_por_anillo') * s.rings()
        return DFX['macla']['densidad_x'] * d if s.defect == 'macla' else d
    def flow(s): return CAU['granos_base'] * 2 ** s.Lf * 3 ** (s.mut[0] * (1 + s.m['mutEff']))
    def lF(s): return min(GRANOS_MAX_LOG10, s.Lf * 0.30103 + s.mut[0] * (1 + s.m['mutEff']) * 0.4771)  # el juego guarda F y G como number: tope 1e300
    def rings(s):
        g0 = l10(L0['anillos']['granos_primer_anillo'])
        r = int(math.floor((s.lG - g0) / 0.30103)) + 1 if s.lG >= g0 else 0
        return r
    def casc_c(s):
        c = s.Lk * CAS['c_por_nivel'] + (0.03 * s.mut[3] if s.Lk else 0) + (s.m['cBonus'] if s.Lk else 0)
        return DFX['dislocacion']['cascada_x'] * c if s.defect == 'dislocacion' else c
    def logV_parts(s):
        h = L0['hito_colores']
        col = 0.0
        for i, c in enumerate(COLS):
            if s.defect == 'vacancia' and i == DFX['vacancia']['color_sin_efecto']: continue  # se compra, pero no suma
            col += s.Lc[i] * l10(c['mult_por_nivel']) + (s.Lc[i] // h['cada']) * l10(s.m['hito'])
        cauce = col * s.m['cauceX']
        rg = s.rings() * l10(s.m['ringBase'] + 0.02 * s.mut[2])
        lg = max(0.0, s.lG)
        cs = max(0.0, s.casc_c() * (CAS['exp_G'] * lg - CAS['exp_penal']))
        mu = s.mut[1] * (1 + s.m['mutEff'])
        pres = s.m['presion']
        if s.defect == 'dislocacion': pres *= DFX['dislocacion']['presion_x']
        if s.defect == 'inclusion': pres = 0.0
        if s.defect == 'macla': mu = 0.0
        if s.defect == 'impureza': col *= DFX['impureza']['colores_x']; cauce *= DFX['impureza']['colores_x']
        esc = 0.0
        P = s.P
        if P.esc_on and s.defect != 'vidrio':
            esc = P.esc_params()[2] * P.logX
        return dict(colores=col, anillos=rg, cascada=cs, mutaciones=mu, presion=pres, eco=s.m['eco'], cauce=cauce, escarcha=esc)
    def lograte(s):
        if s.lG == NEG: return NEG
        lg = s.lG
        tpg = l10(L0['K_derrumbes_por_grano']) + lg
        if s.defect == 'impureza': tpg = min(tpg, DFX['impureza']['derrumbes_tope_log10'])
        r = s.lF() + tpg + s.D() * sum(s.logV_parts().values())
        P = s.P
        if s.defect == 'fatiga': r -= s.rt / DFX['fatiga']['decada_s']
        return r
    # ---- tienda de la Arena
    def color_cost(s, i):
        c = COLS[i]; sx = c['s'] * s.m['colorS']
        return costo_arena(lambda n: quad(c['c0'], c['g'], sx, n), s.Lc[i])
    def flow_cost(s):
        return costo_arena(lambda n: quad(CAU['c0'], CAU['g'], CAU['s'], n), s.Lf)
    def buy_basic(s, which):
        """compra Caudal/colores lo mas barato primero (como un autocomprador o una persona atenta)"""
        n = 0
        while n < 200:
            opts = [('f', s.flow_cost())] if 'f' in which else []
            for i in range(4):
                if i < s.unl_colors and str(i) in which and not (s.defect == 'vacancia' and i == DFX['vacancia']['color_sin_efecto']):
                    opts.append((i, s.color_cost(i)))
            opts = [o for o in opts if o[1] <= s.E]
            if not opts: return
            it, c = min(opts, key=lambda o: o[1])
            s.E = sublog(s.E, c)
            if it == 'f': s.Lf += 1
            else: s.Lc[it] += 1
            n += 1
    def buy_casc(s):
        if s.tier < CAS['compresiones_para_desbloquear']: return
        mx = CAS['nivel_max'] + s.m['cascMax']
        cost = lambda: costo_arena(lambda n: CAS['c0'] + CAS['g'] * n, s.Lk)
        while s.Lk < mx and cost() <= s.E - L1['autocompradores_umbral_log10']:
            s.E = sublog(s.E, cost()); s.Lk += 1
    def buy_mut(s):
        if s.defect == 'macla' or s.tier < MUT['compresiones_para_desbloquear'] or s.maxE_ever < MUT['energia_para_desbloquear_log10']: return
        mx = MUT['nivel_max'] + s.m['mutMax']
        for _ in range(40):
            best = None
            for j, name in enumerate(['caudal', 'colores', 'expansion', 'cascada']):
                if s.mut[j] >= mx: continue
                c = costo_arena(lambda n: MUT[name]['c0'] + MUT[name]['g'] * n, s.mut[j])
                if c <= s.E - L1['autocompradores_umbral_log10'] and (best is None or c < best[1]): best = (j, c)
            if not best: return
            s.E = sublog(s.E, best[1]); s.mut[best[0]] += 1

GRANOS_MAX_LOG10 = 300  # GRANOS_MAX de formulas.ts: con Sedimentacion el Caudal no vuelve a 0 y pasaria de 1e308
CURVA = None      # probe.py: lista donde anotar (t, logE) de la corrida
ABANDONA = True   # probe.py lo apaga para medir la curva entera

def play_arena(P, defect, check, t_now, stats):
    """Una corrida de la Arena (de Infinito a Infinito). Devuelve (duracion_s, logE_final, cumplio_meta)."""
    A = Arena(P, defect); mem = P.red['memoria'] if defect != 'vidrio' or True else 0
    auto_all = mem >= 1
    au = L0['autocompradores']
    broken = P.broken() and defect != 'vidrio' or (P.broken() and defect == 'vidrio')
    meta = L1['defectos'][defect]['meta_log10'] if defect else None
    cap_t = L1['defectos']['abandono_min'] * 60 if defect else 6 * 3600
    t = 0.0; next_check = 0.0; next_auto = 0.0; best_rate = NEG; best_t = 0; est = L1['estratos']; hist = collections.deque()
    gam0 = est['gamma_log10_por_s'] * P.v('estratos', 'flujo_x', 0)
    imp = P.v('inercia', 'impulso_x', 1); sep = P.sep(); emp = est['empuje_por_estrato_inferior']
    while True:
        dt = 0.5 if A.rt < 30 else 1.0 if A.rt < 300 else 2.0
        r = A.lograte()
        if r > NEG: A.E = addlog(A.E, r + l10(dt))
        A.lG = min(GRANOS_MAX_LOG10, addlog(A.lG, A.lF() + l10(dt))); A.rt += dt; t += dt
        A.maxE = max(A.maxE, A.E); A.maxE_ever = max(A.maxE_ever, A.E)
        while A.unl_colors < 4 and A.maxE_ever >= COLS[A.unl_colors]['desbloqueo_log10']: A.unl_colors += 1
        # estratos (persisten entre Infinitos)
        if gam0 and P.est_open and defect != 'vidrio':
            fc = est['factor_caudal']; f1 = min(fc['max'], max(fc['min'], A.lF() / fc['div']))
            g = gam0 * (1 + (imp - 1) * min(1.0, t / est['impulso_s']))  # Inercia: sube lineal hasta los 10 min de la corrida
            for k in range(P.est_open):
                push = 1 + emp * max(0.0, P.s[k + 1]) if k + 1 < P.est_open else 1  # el de abajo empuja
                gk = g * (1 + est['permeabilidad']['suma_gamma'] * P.perm[k]) * (f1 if k == 0 else 1) * push
                ns = P.s[k] + gk * dt
                if k > 0: ns = min(ns, P.s[k - 1] - sep)
                P.s[k] = max(P.s[k], ns)
        human = t >= next_check
        if human: next_check = t + check
        autos = t >= next_auto
        if autos: next_auto = t + 1.0
        # escarcha (persiste)
        if P.esc_on and defect != 'vidrio':
            g, H, m = P.esc_params(); P.logX = min(H, P.logX + g * dt)  # crece hasta el Punto de ruptura H y ahi se queda
            EC = L1['escarcha']
            if P.logX >= H - 1e-9 and (human or P.red['deshielo'] >= 1):
                gain = math.floor(H / EC['esquirlas_por_ruptura_div']) * P.v('deshielo', 'esquirlas_x', 1)
                P.esq = addlog(P.esq, l10(gain)) if gain > 0 else P.esq; P.logX = EC['logX_tras_romper']; stats['rupturas_escarcha'] += 1
        if autos or human:
            which = ''
            if auto_all or A.tier >= au['caudal']: which += 'f'
            if auto_all or A.tier >= au['ambar']: which += '01'
            if auto_all or A.tier >= au['jade']: which += '23'
            if human: which = 'f0123'
            if which: A.buy_basic(which)
            if human or mem >= 2: A.buy_casc()
            if human or mem >= 3: A.buy_mut()
        # compresion
        if A.tier < len(COMP) and A.E >= COMP[A.tier] and (human or auto_all or A.tier >= au['compresion_auto']):
            A.tier += 1; A.reset_run(); A.m = P.mods(defect)
            continue
        # metas
        if defect and A.E >= meta:
            return t, A, True
        if CURVA is not None: CURVA.append((t, A.E))
        if defect:  # el Infinito (a mano o automatico) no saca de un Defecto: solo la meta o abandonar
            if not broken: A.E = min(A.E, INF)
        elif not broken:
            if A.E >= INF and (human or mem >= 4):
                A.E = min(A.E, INF); return t, A, False if defect else False
        else:
            if A.E >= INF:
                lc = soft(P.crys_mult(defect) + L1['cristales']['base_log10'] + ((A.E - INF) / P.Q()) ** L1['cristales']['beta'])
                rate = lc - l10(t)
                if rate > best_rate: best_rate, best_t = rate, t
                elif (human or mem >= 4) and rate < best_rate - 0.01 and t - best_t > 5:
                    return t, A, False
        if defect and ABANDONA:  # desde los 10 min: si al ritmo de los ultimos 3 min la meta queda a mas de 30 min, abandona
            hist.append((t, A.maxE_ever))
            while len(hist) > 1 and hist[1][0] <= t - DFX['abandono_ventana_min'] * 60: hist.popleft()
            if t >= DFX['abandono_revisar_min'] * 60:
                t0, e0 = hist[0]; ritmo = (A.maxE_ever - e0) / max(1e-9, (t - t0) / 60)
                if ritmo <= 0 or (meta - A.maxE_ever) / ritmo > DFX['abandono_meta_max_min']: return t, A, False
        if t >= cap_t:
            return t, A, False

def soft(lc):
    S, k = L1['cristales']['blando_desde_log10'], L1['cristales']['blando_factor']
    return lc if lc <= S else S + (lc - S) * k

def infinity_reward(P, A, defect, ganado=False):
    E = min(A.E, INF) if not P.broken() else A.E
    if E < INF and not ganado: return NEG  # ganar un Defecto con meta < 1e308 da los Cristales de un Infinito sin romper
    lc = soft(P.crys_mult(defect) + L1['cristales']['base_log10'] + (max(0.0, E - INF) / P.Q()) ** L1['cristales']['beta'])
    if lc < 6: lc = l10(max(1, math.floor(10 ** lc)))
    return lc

# ------------------------------------------------------------------ compras de la Capa 1
def shop_items(P):
    it = []
    for k in P.open_nodes(): it.append(('red', k, red_cost(k, P.red[k])))
    E = L1['estratos']
    if P.red['estratos'] >= 1:
        if P.est_open < E['cantidad']: it.append(('abrir', P.est_open, precio(E['abrir_log10'][P.est_open])))
        for k in range(P.est_open):
            pe, pr = E['permeabilidad'], E['presion']
            it.append(('perm', k, precio(pe['c0'] + pe['por_profundidad'] * k + pe['paso'] * P.perm[k] + pe['cub'] * P.perm[k] ** 3 / 6)))
            it.append(('pres', k, precio(pr['c0'] + pr['por_profundidad'] * k + pr['paso'] * P.pres[k] + pr['cub'] * P.pres[k] ** 3 / 6)))
    return it
def esq_items(P):
    if not P.esc_on: return []
    M = L1['escarcha']['mejoras']; out = [('esc', k, precio(M[k]['c0'] + M[k]['paso'] * P.escup[k])) for k in M]  # costo en log10 de Esquirlas
    px = P.v('engarces2', 'pulido_x', 1.0)
    PU = L1['escarcha']['pulido']
    for i, (u, n) in enumerate(P.equipped):  # Pulido: sube un color una pieza engarzada (nivel n -> n+1), sin fusionar
        out.append(('pul', i, precio(PU['c0'] + PU['paso'] * n * px)))
    return out
def do_shop(P, t, log, stats):
    bought = 0
    for _ in range(400):
        items = [x for x in shop_items(P) if x[2] <= P.C]
        if not items: break
        pr = L1['red']['prioridad_bot']
        kind, k, c = min(items, key=lambda x: x[2] - (pr.get(x[1], 0) if x[0] == 'red' else 0))
        P.C = sublog(P.C, c); bought += 1
        if kind == 'red':
            P.red[k] += 1; nm = f'Red {k} nv{P.red[k]}'
        elif kind == 'abrir':
            p0 = P.presion(); k = P.est_open; E = L1['estratos']
            P.s[k] = E['s1_inicial'] if k == 0 else P.s[k - 1] - P.sep()  # se llena de golpe hasta su tope
            P.est_open += 1; nm = f'Abrir estrato {P.est_open}'
            stats.setdefault('aperturas', []).append((t, P.est_open, P.presion() - p0, P.last_D))
        elif kind == 'perm': P.perm[k] += 1; nm = f'Permeabilidad E{k + 1} nv{P.perm[k]}'
        else: P.pres[k] += 1; nm = f'Presion E{k + 1} nv{P.pres[k]}'
        log(t, nm, kind == 'red' or kind == 'abrir')
    for _ in range(200):
        items = [x for x in esq_items(P) if x[2] <= P.esq]
        if not items: break
        kind, k, c = min(items, key=lambda x: x[2])
        P.esq = sublog(P.esq, c); bought += 1
        if kind == 'esc': P.escup[k] += 1; log(t, f'Escarcha {k} nv{P.escup[k]}', False)
        else:  # en el conteo en base 3, pasar una pieza de nivel n a n+1 es sumar 2 x 3^n
            u, n = P.equipped[k]; P.polish[u] += 2 * 3 ** n; P.equipped[k] = (u, n + 1); log(t, f'Pulido {u} nv{n + 1}', False)
    return bought

def pick_relic(P, A):
    """cada Infinito elige el tipo con la regla por defecto del panel de Automatizacion del juego (Completar fusiones,
    tipoAutomatico de relicario.ts): al que le falten menos Ambar para fusionar; empate, el que tiene alguna engarzada; despues
    el orden de los tipos. Nunca un tipo que no puede engarzar (sin pieza puesta y sin espacio libre). Fusiona (como el bot
    del test) y engarza las mejores: mayor nivel primero; empate, la que ya estaba y el orden de los tipos (equiparMejores)."""
    tipos = L1['relicario']['tipos']; puestos = {t for t, n in P.equipped}
    def ambar(t): return (P.relic[t] + P.polish[t]) % 3
    cands = [t for t in tipos if t in puestos or len(P.equipped) < P.slots()] or tipos
    choice = min(cands, key=lambda t: ((3 - ambar(t)) * 2 - (1 if t in puestos else 0), tipos.index(t)))
    P.relic[choice] += 1
    pz = [(t, n) for t in tipos for n in P.pieces(t)]
    P.equipped = sorted(pz, key=lambda p: (-p[1], p not in P.equipped, tipos.index(p[0])))[:P.slots()]

# ------------------------------------------------------------------ partida completa
def simulate(check=15.0, tmax=24 * 3600, verbose=False, horizon_end=True):
    P = Player(); t = 0.0
    stats = dict(rupturas_escarcha=0, infinitos=0, eventos={}, compras=[], huecos=[], partes11=None, partes12=None)
    def log(tt, msg, major):
        stats['compras'].append(tt)
        stats.setdefault('por_inf', {}).setdefault(P.ninf, []).append(msg)
        if msg not in stats['eventos']: stats['eventos'][msg] = tt
        if verbose and major: print(f'{tt / 3600:6.2f} h  {msg}')
    def mark(tt, msg):
        if msg not in stats['eventos']:
            stats['eventos'][msg] = tt
            if verbose: print(f'{tt / 3600:6.2f} h  ** {msg}')
    # primer Infinito: 1 cristal y la primera reliquia
    P.C = 0.0; P.Ctot = 0.0; P.ninf = 1; stats['infinitos'] = 1
    A0 = Arena(P, None); A0.lG = 18.0; A0.maxE = INF  # el primer Infinito llego a 1e308
    pick_relic(P, A0); do_shop(P, t, log, stats)
    while t < tmax:
        # defecto disponible?
        defect = None
        for d in DEFS:
            rq = L1['defectos']['requisitos'][d]; node, lvl = rq['red']
            if d in P.done or P.red[node] < lvl: continue
            if P.est_open < rq.get('estratos_abiertos', 0) or P.Ctot < rq.get('cristales_totales_log10', NEG): continue
            prev = DEFS[DEFS.index(d) - 1] if DEFS.index(d) % 4 else None
            if prev and prev not in P.done: continue
            if P.retry_at.get(d, NEG) > P.Ctot: continue
            defect = d; break
        dur, A, ok = play_arena(P, defect, check, t, stats)
        abandono = defect and not ok  # abandonar no es un Infinito: sin Cristales ni reliquia
        t += dur
        if not abandono: P.ninf += 1; stats['infinitos'] += 1
        P.last_mut = list(A.mut); P.last_D = A.D()
        pp = A.logV_parts()
        stats.setdefault('runs', []).append((round(t / 3600, 2), round(dur / 60, 1), defect, round(A.E, 1), round(P.Ctot, 2),
            {k: round(v, 1) for k, v in pp.items()}, round(A.D(), 2), P.perm[:P.est_open], P.pres[:P.est_open], [round(x) for x in P.s[:P.est_open]]))
        if P.ninf == 2: mark(t, 'segundo Infinito')
        if defect:
            if ok: P.done.add(defect); mark(t, f'Defecto {defect}'); stats['compras'].append(t)  # ganar un Defecto cuenta como progreso (recompensa permanente)
            else: P.retry_at[defect] = P.Ctot + DFX['reintento_cristales_totales_log10']
        lc = NEG if abandono else infinity_reward(P, A, defect, ok)  # abandonar no cobra, aunque haya pasado 1e308
        if lc > NEG:
            P.C = addlog(P.C, lc); P.Ctot = addlog(P.Ctot, lc)
        stats.setdefault('ganado', {})[P.ninf] = (round(t / 3600, 2), round(dur / 60, 1), lc, defect)
        if not abandono:
            for _ in range(P.v('engarces', 'reliquias_por_infinito', 1)): pick_relic(P, A)  # Engarces nv4: dos reliquias
        P.last_logG = max(10.0, A.lG)
        do_shop(P, t, log, stats)
        if P.red['memoria'] >= 4: mark(t, 'Memoria completa')
        if P.broken(): mark(t, 'Romper el Infinito')
        if P.est_open >= 1: mark(t, 'Estratos')
        if P.s[7] >= L1['estratos']['meta_1_1_estrato8_log10'] and 'impureza' in P.done and not P.esc_on:
            P.esc_on = True; mark(t, 'FIN 1.1: Estrato 8 lleno -> Escarcha')
            stats['partes11'] = (A.logV_parts(), A.D(), t)
        if P.Ctot >= 308.25:
            mark(t, 'FIN CAPA 1: 1e308 Cristales'); stats['partes12'] = (A.logV_parts(), A.D(), t); break
    ts = sorted(stats['compras'])
    ts = [x for x in ts if x > 1.5 * 3600]  # la 2.a corrida (~1 h, solo compras de la Arena) es intencional
    stats['hueco_max'] = max((b - a for a, b in zip(ts, ts[1:])), default=0)
    stats['T'] = t; stats['P'] = P
    return stats

def report(st):
    ev = st['eventos']
    keys = ['segundo Infinito', 'Memoria completa', 'Estratos', 'Defecto vacancia', 'Romper el Infinito', 'Defecto dislocacion',
            'Defecto macla', 'Defecto impureza', 'FIN 1.1: Estrato 8 lleno -> Escarcha', 'Defecto fatiga', 'Defecto frontera',
            'Defecto inclusion', 'Defecto vidrio', 'FIN CAPA 1: 1e308 Cristales']
    for k in keys: print(f'  {k:42s} {ev[k] / 3600:6.2f} h' if k in ev else f'  {k:42s}   --')
    print(f"  infinitos {st['infinitos']}  rupturas de escarcha {st['rupturas_escarcha']}  hueco max entre compras de la Capa 1 (desde 1.5 h) {st['hueco_max'] / 60:.1f} min")
    ap = st.get('aperturas', [])
    if ap: print('  abrir estrato (h, k, x produccion = 10^(D*dPresion)): ' + '  '.join(f'{t / 3600:.2f}h E{k} x1e{d * D:.1f}' for t, k, d, D in ap))
    for name in ('partes11', 'partes12'):
        if st[name]:
            parts, D, _ = st[name]; tot = sum(parts.values())
            print(f'  {name}: D={D:.2f} ' + ' '.join(f'{k} {100 * v / tot:.0f}%' for k, v in parts.items()))

def primeros(st, n=8):
    """Que compra el bot con lo que dejo cada uno de los primeros n Infinitos (el 1 es el primer Infinito de la Capa 0)."""
    g = st.get('ganado', {}); pi = st.get('por_inf', {})
    for i in range(1, n + 1):
        h, d, lc, df = g.get(i, (0, 0, 0.0, None))
        c = round(10 ** lc) if lc < 6 else f'1e{lc:.1f}'
        compras = [x for x in pi.get(i, []) if x.startswith('Red') or x.startswith('Abrir')]
        print(f'  Inf {i:2d}  {h:5.2f} h  corrida {d:5.1f} min  +{c} Cristales{"  (" + df + ")" if df else ""}:  ' + (', '.join(compras) or '-'))

if __name__ == '__main__':
    if '--primeros' in sys.argv:
        st = simulate(); report(st); primeros(st, int(sys.argv[sys.argv.index('--primeros') + 1])); sys.exit()
    if '--robustez' in sys.argv:
        for ce in (15, 60, 300):
            st = simulate(check=ce); print(f'== revisa cada {ce} s'); report(st)
    else:
        st = simulate(verbose='--detalle' in sys.argv); report(st)
