"""Simulador de referencia de la Capa 1 (Cristalizacion) de Avalancha.

Juega la Arena (Capa 0) y la Cristalizacion juntas desde el primer Infinito, con las formulas
de SPEC_CAPA1.md y las constantes de config.json (Capa 0) + config_capa1.json (Capa 1).

    python3 sim_capa1.py              -> hitos y tiempos del jugador de referencia (revisa cada 15 s)
    python3 sim_capa1.py --robustez   -> mismo juego revisando cada 15 s / 60 s / 5 min
    python3 sim_capa1.py --detalle    -> ademas, cada compra de la Capa 1

El tiempo cuenta desde el primer Infinito (la Capa 0 completa dura ~3 h y no cambia).
Todo numero grande vive en log10.
"""
import json, math, os, random, sys

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

# ------------------------------------------------------------------ Red
RED = dict(L1['red']['nodos']); RED.update(L1['red']['anillo3_1.2'])
RING3 = set(L1['red']['anillo3_1.2'])
POS = {k: tuple(v['pos']) for k, v in RED.items()}
BYPOS = {v: k for k, v in POS.items()}
def ring(k): x, y = POS[k]; return abs(x) + abs(y)
def red_cost(k, lvl):
    r = ring(k); base = RED[k].get('costo_base_log10', L1['red']['costo_anillo_log10'][r])
    return base + L1['red']['paso_nivel_log10'][r] * lvl
DEFS = [k for k in L1['defectos'] if k not in ('abandono_min', 'requisitos')]
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
        s.rng = random.Random(L1['relicario']['semilla'])
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
            x, y = POS[k]
            nb = [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
            if any(BYPOS.get(p) and s.red[BYPOS[p]] >= 4 and ring(BYPOS[p]) < ring(k) for p in nb): out.append(k)
        return out
    def relic_level(s, t):
        c = s.relic[t] + s.polish[t]
        return int(math.floor(math.log(c, 3) + 1e-9)) if c >= 1 else -1
    def slots(s):
        return max(1, s.v('engarces', 'espacios', 1), s.v('engarces2', 'espacios', 1))

    # -------------------------------------------------- modificadores para la Arena
    def mods(s, defect):
        R = L1['relicario']; noRed = False  # vidrio: sin Relicario, Eco ni Escarcha (la Red sigue)
        m = dict(extraV=0.0, dAdd=0.0, cBonus=0.0, cascMax=0, mutMax=0, mutEff=0.0, keep=0, hito=4.0, ringBase=1.10,
                 colorS=1.0, presion=0.0, eco=0.0, cauce=0.0, cauceX=0.0)
        if 'vacancia' in s.done: m['hito'] = 6.0
        if 'dislocacion' in s.done: m['ringBase'] = 1.12
        if 'macla' in s.done: m['colorS'] = 0.9
        if 'impureza' in s.done: m['cBonus'] += 0.1
        if 'frontera' in s.done: m['dAdd'] += 0.2
        if not noRed:
            m['dAdd'] += s.v('compactacion', 'densidad') + s.v('compactacion2', 'densidad')
            m['cascMax'] = s.v('cascada_plus', 'nivel_max_extra'); m['mutMax'] = s.v('mutacion_plus', 'nivel_max_extra')
            m['keep'] = max(s.v('memoria', 'conservar_compresiones'), s.v('sedimentacion', 'conservar_compresiones'))
            p = s.v('eco', 'p') + s.v('eco2', 'p_extra')
            m['eco'] = 0.0 if defect == 'vidrio' else p * max(0.0, s.Ctot)
            if s.v('estratos', 'flujo_x', 0):
                wx = s.v('presion', 'w_x', 1) * s.v('sedimento2', 'w_x', 1) * s.v('abismo', 'w_x', 1)
                pr = 0.0
                for k in range(s.est_open):
                    w = L1['estratos']['w_base_por_profundidad'] * (k + 1) * wx * (1 + L1['estratos']['presion']['suma_w'] * s.pres[k])
                    pr += w * max(0.0, s.s[k]) ** L1['estratos']['exponente_presion']
                m['presion'] = pr; s.last_pres = pr
        if defect != 'vidrio':
            for t in s.equipped:
                n = s.relic_level(t)
                if n < 0: continue
                if t == 'cauce': m['cauceX'] = R['cauce_colores_pct_por_nivel'] * (n + 1)
                if t == 'cascada': m['cBonus'] += R['cascada_c_por_nivel'] * (n + 1)
                if t == 'mutaciones': m['mutEff'] = R['mutaciones_efecto_por_nivel'] * (n + 1)
        m['extraV'] = m['presion'] + m['eco'] + m['cauce']
        return m
    def crys_mult(s, defect):
        if defect == 'vidrio': return 0.0
        x = s.v('ruptura', 'cristales_log10') + s.v('cristalografia', 'cristales_log10') + s.v('cristalografia2', 'cristales_log10')
        if 'vidrio' in s.done: x += L1['defectos']['vidrio']['cristales_log10']
        return x
    def Q(s): return L1['cristales']['Q_ordenes_por_x10'] - s.v('ruptura2', 'Q_resta')
    def broken(s): return s.red['ruptura'] >= 1
    def esc_params(s):
        E = L1['escarcha']; up = s.escup; M = E['mejoras']
        g = E['g_log10_por_s'] * (1 + E.get('g_por_presion', 0.01) * s.last_pres) * M['crecimiento']['x'] ** up['crecimiento'] * s.v('germen', 'escarcha_g_x', 1) * (2 if 'fatiga' in s.done else 1)
        H = E['H'] * M['aguante']['x_H'] ** up['aguante'] * s.v('frio', 'escarcha_H_x', 1) * (1.5 if 'inclusion' in s.done else 1)
        m = E['m'] + M['brillo']['suma_m'] * up['brillo']
        return g, H, m

# ------------------------------------------------------------------ Arena
COLS = L0['colores']; CAU = L0['caudal']; CAS = L0['cascada']; MUT = L0['mutaciones']; COMP = L0['compresion']['umbrales_log10']
def quad(c0, g, s_, L): return c0 + g * L + s_ * L * L / 2

class Arena:
    def __init__(s, P, defect):
        s.P = P; s.defect = defect; s.m = P.mods(defect)
        s.tier = min(s.m['keep'], len(COMP)); s.mut = [0, 0, 0, 0]  # caudal colores expansion cascada
        s.reset_run(); s.maxE_ever = NEG
        s.unl_colors = 1; s.plateau_E = NEG; s.plateau_t = 0.0
    def reset_run(s):
        s.E = NEG; s.lG = NEG; s.Lf = 0; s.Lc = [0, 0, 0, 0]; s.Lk = 0; s.rt = 0.0; s.maxE = NEG
    def D(s):
        if s.defect == 'frontera': return 1.0
        if s.defect == 'macla': return 0.85 * (1 + L0['compresion']['densidad_por_nivel'] * s.tier + s.m['dAdd'])
        return 1 + L0['compresion']['densidad_por_nivel'] * s.tier + s.m['dAdd']
    def flow(s): return CAU['granos_base'] * 2 ** s.Lf * 3 ** (s.mut[0] * (1 + s.m['mutEff']))
    def lF(s): return CAU['granos_base'] * 0 + s.Lf * 0.30103 + s.mut[0] * (1 + s.m['mutEff']) * 0.4771
    def rings(s):
        g0 = l10(L0['anillos']['granos_primer_anillo'])
        r = int(math.floor((s.lG - g0) / 0.30103)) + 1 if s.lG >= g0 else 0
        return r
    def casc_c(s):
        c = s.Lk * CAS['c_por_nivel'] + (0.03 * s.mut[3] if s.Lk else 0) + (s.m['cBonus'] if s.Lk else 0)
        return 0.0 if s.defect == 'dislocacion' else c
    def logV_parts(s):
        h = L0['hito_colores']
        col = 0.0
        for i, c in enumerate(COLS):
            if s.defect == 'vacancia' and i == 3: continue
            col += s.Lc[i] * l10(c['mult_por_nivel']) + (s.Lc[i] // h['cada']) * l10(s.m['hito'])
        cauce = col * s.m['cauceX']
        rg = s.rings() * l10(s.m['ringBase'] + 0.02 * s.mut[2])
        lg = max(0.0, s.lG)
        cs = max(0.0, s.casc_c() * (CAS['exp_G'] * lg - CAS['exp_penal']))
        mu = s.mut[1] * (1 + s.m['mutEff'])
        pres = s.m['presion']
        if s.defect == 'dislocacion': pres *= 0.5
        if s.defect == 'inclusion': pres = 0.0
        if s.defect == 'macla': mu = 0.0
        if s.defect == 'impureza': col *= 0.5; cauce *= 0.5
        esc = 0.0
        P = s.P
        if P.esc_on and s.defect != 'vidrio':
            esc = P.esc_params()[2] * P.logX
        return dict(colores=col, anillos=rg, cascada=cs, mutaciones=mu, presion=pres, eco=s.m['eco'], cauce=cauce, escarcha=esc)
    def lograte(s):
        if s.lG == NEG: return NEG
        lg = s.lG
        tpg = l10(L0['K_derrumbes_por_grano']) + lg
        if s.defect == 'impureza': tpg = min(tpg, 4.0)
        r = s.lF() + tpg + s.D() * sum(s.logV_parts().values())
        P = s.P
        if P.esc_on and s.defect != 'vidrio':
            g, H, m = P.esc_params(); pen = 1
            r -= pen * l10(1 + P.logX / H)
        if s.defect == 'fatiga': r -= s.rt / 600
        return r
    # ---- tienda de la Arena
    def color_cost(s, i):
        c = COLS[i]; gx = 1.0
        return quad(c['c0'], c['g'] * gx, c['s'] * s.m['colorS'], s.Lc[i])
    def flow_cost(s):
        gx = 1.0
        return quad(CAU['c0'], CAU['g'] * gx, CAU['s'], s.Lf)
    def buy_basic(s, which):
        """compra Caudal/colores lo mas barato primero (como un autocomprador o una persona atenta)"""
        n = 0
        while n < 200:
            opts = [('f', s.flow_cost())] if 'f' in which else []
            for i in range(4):
                if i < s.unl_colors and str(i) in which and not (s.defect == 'vacancia' and i == 3):
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
        while s.Lk < mx and CAS['c0'] + CAS['g'] * s.Lk <= s.E - L1['autocompradores_umbral_log10']:
            s.E = sublog(s.E, CAS['c0'] + CAS['g'] * s.Lk); s.Lk += 1
    def buy_mut(s):
        if s.defect == 'macla' or s.tier < MUT['compresiones_para_desbloquear'] or s.maxE_ever < MUT['energia_para_desbloquear_log10']: return
        mx = MUT['nivel_max'] + s.m['mutMax']
        for _ in range(40):
            best = None
            for j, name in enumerate(['caudal', 'colores', 'expansion', 'cascada']):
                if s.mut[j] >= mx: continue
                c = MUT[name]['c0'] + MUT[name]['g'] * s.mut[j]
                if c <= s.E - L1['autocompradores_umbral_log10'] and (best is None or c < best[1]): best = (j, c)
            if not best: return
            s.E = sublog(s.E, best[1]); s.mut[best[0]] += 1

def play_arena(P, defect, check, t_now, stats):
    """Una corrida de la Arena (de Infinito a Infinito). Devuelve (duracion_s, logE_final, cumplio_meta)."""
    A = Arena(P, defect); mem = P.red['memoria'] if defect != 'vidrio' or True else 0
    auto_all = mem >= 1
    au = L0['autocompradores']
    broken = P.broken() and defect != 'vidrio' or (P.broken() and defect == 'vidrio')
    meta = L1['defectos'][defect]['meta_log10'] if defect else None
    cap_t = L1['defectos']['abandono_min'] * 60 if defect else 6 * 3600
    t = 0.0; next_check = 0.0; next_auto = 0.0; best_rate = NEG; best_t = 0; est = L1['estratos']
    fx = P.v('estratos', 'flujo_x', 0) * P.v('inercia', 'flujo_x', 1) * P.v('capilaridad', 'flujo_x', 1)
    gam0 = est['gamma_log10_por_s'] * fx
    while True:
        dt = 0.5 if A.rt < 30 else 1.0 if A.rt < 300 else 2.0
        r = A.lograte()
        if r > NEG: A.E = addlog(A.E, r + l10(dt))
        A.lG = addlog(A.lG, A.lF() + l10(dt)); A.rt += dt; t += dt
        A.maxE = max(A.maxE, A.E); A.maxE_ever = max(A.maxE_ever, A.E)
        while A.unl_colors < 4 and A.maxE_ever >= COLS[A.unl_colors]['desbloqueo_log10']: A.unl_colors += 1
        # estratos (persisten entre Infinitos)
        if gam0 and P.est_open and defect != 'vidrio':
            fc = est['factor_caudal']; f1 = min(fc['max'], max(fc['min'], A.lF() / fc['div']))
            sep = est['separacion_log10']
            for k in range(P.est_open):
                gk = gam0 * (1 + est['permeabilidad']['suma_gamma'] * P.perm[k]) * (f1 if k == 0 else 1)
                if P.s[k] == NEG: P.s[k] = 0.0
                ns = P.s[k] + gk * dt
                if k > 0: ns = min(ns, P.s[k - 1] - sep)
                ns = min(ns, est['capacidad_log10'][k] * P.v('abismo', 'capacidad_x', 1) * P.v('capilaridad', 'capacidad_x', 1))
                P.s[k] = max(P.s[k], ns)
        human = t >= next_check
        if human: next_check = t + check
        autos = t >= next_auto
        if autos: next_auto = t + 1.0
        # escarcha (persiste)
        if P.esc_on and defect != 'vidrio':
            g, H, m = P.esc_params(); P.logX += g * dt
            EC = L1['escarcha']
            P.esc_t = getattr(P, 'esc_t', 0.0) + dt
            if P.esc_t >= EC['ruptura_bot_min'] * 60 and (human or P.red['deshielo'] >= 1):
                P.esc_t = 0.0
                keep = EC['conserva_al_romper']
                gain = math.floor(P.logX * (1 - keep) / EC['esquirlas_por_ruptura_div']) * P.v('deshielo', 'esquirlas_x', 1)
                P.esq = addlog(P.esq, l10(gain)) if gain > 0 else P.esq; P.logX *= keep; stats['rupturas_escarcha'] += 1
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
        if not broken:
            if A.E >= INF and (human or mem >= 4):
                A.E = min(A.E, INF); return t, A, False if defect else False
        else:
            if A.E >= INF:
                lc = soft(P.crys_mult(defect) + L1['cristales']['base_log10'] + ((A.E - INF) / P.Q()) ** L1['cristales']['beta'])
                rate = lc - l10(t)
                if rate > best_rate: best_rate, best_t = rate, t
                elif (human or mem >= 4) and rate < best_rate - 0.01 and t - best_t > 5:
                    return t, A, False
        if defect:  # una persona abandona el Defecto cuando deja de avanzar 2 minutos
            prog = A.tier * 1e5 + A.maxE
            if prog > getattr(A, 'plateau_E', NEG) + 0.5: A.plateau_E, A.plateau_t = prog, t
            elif t - A.plateau_t > 120: return t, A, False
        if t >= cap_t:
            return t, A, False

def soft(lc):
    S, k = L1['cristales']['blando_desde_log10'], L1['cristales']['blando_factor']
    return lc if lc <= S else S + (lc - S) * k

def infinity_reward(P, A, defect):
    E = min(A.E, INF) if not P.broken() else A.E
    if E < INF: return NEG
    lc = soft(P.crys_mult(defect) + L1['cristales']['base_log10'] + (max(0.0, E - INF) / P.Q()) ** L1['cristales']['beta'])
    if lc < 6: lc = l10(max(1, math.floor(10 ** lc)))
    return lc

# ------------------------------------------------------------------ compras de la Capa 1
def shop_items(P):
    it = []
    for k in P.open_nodes(): it.append(('red', k, red_cost(k, P.red[k])))
    E = L1['estratos']
    if P.red['estratos'] >= 1:
        if P.est_open < E['cantidad']: it.append(('abrir', P.est_open, E['abrir_log10'][P.est_open]))
        for k in range(P.est_open):
            pe, pr = E['permeabilidad'], E['presion']
            it.append(('perm', k, pe['c0'] + pe['por_profundidad'] * k + pe['paso'] * P.perm[k] + pe['cub'] * P.perm[k] ** 3 / 6))
            it.append(('pres', k, pr['c0'] + pr['por_profundidad'] * k + pr['paso'] * P.pres[k] + pr['cub'] * P.pres[k] ** 3 / 6))
    return it
def esq_items(P):
    if not P.esc_on: return []
    M = L1['escarcha']['mejoras']; out = [('esc', k, M[k]['c0'] + M[k]['paso'] * P.escup[k]) for k in M]  # costo en log10 de Esquirlas
    px = P.v('engarces2', 'pulido_x', 1.0)
    for t in P.relic:
        if t in P.equipped:
            out.append(('pul', t, L1['escarcha']['pulido']['c0'] + L1['escarcha']['pulido']['paso'] * P.polish[t] * px + l10(max(1, P.relic[t])) ))
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
        elif kind == 'abrir': P.est_open += 1; nm = f'Abrir estrato {P.est_open}'
        elif kind == 'perm': P.perm[k] += 1; nm = f'Permeabilidad E{k + 1} nv{P.perm[k]}'
        else: P.pres[k] += 1; nm = f'Presion E{k + 1} nv{P.pres[k]}'
        log(t, nm, kind == 'red' or kind == 'abrir')
    for _ in range(200):
        items = [x for x in esq_items(P) if x[2] <= P.esq]
        if not items: break
        kind, k, c = min(items, key=lambda x: x[2])
        P.esq = sublog(P.esq, c); bought += 1
        if kind == 'esc': P.escup[k] += 1; log(t, f'Escarcha {k} nv{P.escup[k]}', False)
        else: P.polish[k] += 1; log(t, f'Pulido {k}', False)
    return bought

def pick_relic(P, A):
    R = L1['relicario']; n = P.v('engarces', 'ofertas', R['ofertas_por_infinito'])
    tipos = R['tipos']
    offer = [P.rng.choice(tipos) for _ in range(n)]
    if len(set(offer)) == 1: offer[-1] = tipos[(tipos.index(offer[0]) + 1) % 3]
    # valor estimado de cada tipo (en log10 de produccion)
    D = A.D(); lg = max(10.0, A.lG)
    def val(t, lvl):
        if lvl < 0: return 0
        if t == 'cauce': return D * R['cauce_colores_pct_por_nivel'] * (lvl + 1) * 0.3 * max(30.0, A.maxE)
        if t == 'cascada': return D * R['cascada_c_por_nivel'] * (lvl + 1) * CAS['exp_G'] * lg
        return D * R['mutaciones_efecto_por_nivel'] * (lvl + 1) * (A.mut[1] + 0.477 * A.mut[0] + 1)
    def gain(t):
        lv = P.relic_level(t)
        P.relic[t] += 1; lv2 = P.relic_level(t); P.relic[t] -= 1
        return val(t, lv2) - val(t, lv)
    choice = max(set(offer), key=lambda t: (gain(t), val(t, P.relic_level(t))))
    P.relic[choice] += 1
    P.equipped = sorted(tipos, key=lambda t: -val(t, P.relic_level(t)))[:P.slots()]

# ------------------------------------------------------------------ partida completa
def simulate(check=15.0, tmax=24 * 3600, verbose=False, horizon_end=True):
    P = Player(); t = 0.0
    stats = dict(rupturas_escarcha=0, infinitos=0, eventos={}, compras=[], huecos=[], partes11=None, partes12=None)
    def log(tt, msg, major):
        stats['compras'].append(tt)
        if msg not in stats['eventos']: stats['eventos'][msg] = tt
        if verbose and major: print(f'{tt / 3600:6.2f} h  {msg}')
    def mark(tt, msg):
        if msg not in stats['eventos']:
            stats['eventos'][msg] = tt
            if verbose: print(f'{tt / 3600:6.2f} h  ** {msg}')
    # primer Infinito: 1 cristal y la primera reliquia
    P.C = 0.0; P.Ctot = 0.0; P.ninf = 1; stats['infinitos'] = 1
    A0 = Arena(P, None); A0.lG = 18.0
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
        t += dur; P.ninf += 1; stats['infinitos'] += 1
        pp = A.logV_parts()
        stats.setdefault('runs', []).append((round(t / 3600, 2), round(dur / 60, 1), defect, round(A.E, 1), round(P.Ctot, 2),
            {k: round(v, 1) for k, v in pp.items()}, round(A.D(), 2), P.perm[:P.est_open], P.pres[:P.est_open], [round(x) for x in P.s[:P.est_open]]))
        if P.ninf == 2: mark(t, 'segundo Infinito')
        if defect:
            if ok: P.done.add(defect); mark(t, f'Defecto {defect}')
            else: P.retry_at[defect] = P.Ctot + 1.5
        lc = infinity_reward(P, A, defect)
        if lc > NEG:
            P.C = addlog(P.C, lc); P.Ctot = addlog(P.Ctot, lc)
        pick_relic(P, A)
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
    for name in ('partes11', 'partes12'):
        if st[name]:
            parts, D, _ = st[name]; tot = sum(parts.values())
            print(f'  {name}: D={D:.2f} ' + ' '.join(f'{k} {100 * v / tot:.0f}%' for k, v in parts.items()))

if __name__ == '__main__':
    if '--robustez' in sys.argv:
        for ce in (15, 60, 300):
            st = simulate(check=ce); print(f'== revisa cada {ce} s'); report(st)
    else:
        st = simulate(verbose='--detalle' in sys.argv); report(st)
