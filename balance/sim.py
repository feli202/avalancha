"""Simulador de referencia de la Capa 0 de Avalancha.

Implementa EXACTAMENTE las formulas de SPEC.md (seccion 4) con las constantes de config.json,
y un bot que juega como un jugador atento. Sirve para verificar el balance:

    python3 sim.py            -> tabla de tiempos por estilo de jugador
    python3 sim.py --timeline -> linea de tiempo detallada (jugador que revisa cada 15 s)

Todo numero grande vive en log10 (un double no alcanza para 1e308 con margen).
"""
import json, math, os, sys

CFG = json.load(open(os.path.join(os.path.dirname(__file__), 'config.json')))
INF = CFG['infinito_log10']

def l10(x): return math.log10(x) if x > 0 else -math.inf
def addlog(a, b):
    if a < b: a, b = b, a
    return a if b == -math.inf or b < a - 30 else a + math.log10(1 + 10 ** (b - a))
def sublog(a, b): return a + math.log10(1 - 10 ** (b - a)) if b < a - 1e-12 else -math.inf
def quad(c0, g, s, L): return c0 + g * L + s * L * L / 2          # log10 del costo del nivel L -> L+1

class State:
    def __init__(s):
        # permanente en la Capa 0
        s.tier = 0; s.mut = {k: 0 for k in ('caudal', 'colores', 'expansion', 'cascada')}
        s.max_ever = -math.inf; s.unlocked_colors = 1
        s.reset_run(); s.G = float(CFG['granos_iniciales'])  # solo la primera corrida
    def reset_run(s):
        s.E = -math.inf; s.G = 0.0; s.Lf = 0; s.Lc = [0, 0, 0, 0]; s.Lk = 0; s.run_t = 0.0

    # ---------- formulas (SPEC 4) ----------
    def D(s): return 1 + CFG['compresion']['densidad_por_nivel'] * s.tier
    def flow(s):
        c = CFG['caudal']; return c['granos_base'] * c['mult_por_nivel'] ** s.Lf * CFG['mutaciones']['caudal']['por_nivel'] ** s.mut['caudal']
    def rings(s):
        g0 = CFG['anillos']['granos_primer_anillo']
        return int(math.floor(math.log2(s.G / g0))) + 1 if s.G >= g0 else 0
    def casc_c(s):
        k = CFG['cascada']; return s.Lk * k['c_por_nivel'] + (CFG['mutaciones']['cascada']['por_nivel'] * s.mut['cascada'] if s.Lk > 0 else 0)
    def logV(s):
        t = 0.0; h = CFG['hito_colores']
        for i, col in enumerate(CFG['colores']):
            t += s.Lc[i] * l10(col['mult_por_nivel']) + (s.Lc[i] // h['cada']) * l10(h['mult'])
        t += s.rings() * l10(CFG['anillos']['mult_por_anillo'] + CFG['mutaciones']['expansion']['por_nivel'] * s.mut['expansion'])
        if s.G > 1:
            k = CFG['cascada']; t += max(0.0, s.casc_c() * (k['exp_G'] * l10(s.G) - k['exp_penal']))
        return t + s.mut['colores'] * l10(CFG['mutaciones']['colores']['por_nivel'])
    def lograte(s):
        if s.G <= 0: return -math.inf
        return l10(s.flow()) + l10(CFG['K_derrumbes_por_grano'] * s.G) + s.D() * s.logV()

    # ---------- tienda ----------
    def shop(s):
        o = [('caudal', quad(**{k: CFG['caudal'][k] for k in ('c0', 'g', 's')}, L=s.Lf))]
        for i, col in enumerate(CFG['colores'][:s.unlocked_colors]):
            o.append((f'color{i}', quad(col['c0'], col['g'], col['s'], s.Lc[i])))
        k = CFG['cascada']
        if s.tier >= k['compresiones_para_desbloquear'] and s.Lk < k['nivel_max']:
            o.append(('cascada', k['c0'] + k['g'] * s.Lk))
        m = CFG['mutaciones']
        if s.tier >= m['compresiones_para_desbloquear'] and s.max_ever >= m['energia_para_desbloquear_log10']:
            for name in s.mut:
                if s.mut[name] < m['nivel_max']: o.append((f'mut_{name}', m[name]['c0'] + m[name]['g'] * s.mut[name]))
        return o
    def apply(s, it):
        if it == 'caudal': s.Lf += 1
        elif it == 'cascada': s.Lk += 1
        elif it.startswith('color'): s.Lc[int(it[5])] += 1
        else: s.mut[it[4:]] += 1
    def next_threshold(s):
        u = CFG['compresion']['umbrales_log10']; return u[s.tier] if s.tier < len(u) else math.inf

AUTO = {'caudal': 'caudal', 'color0': 'ambar', 'color1': 'coral', 'color2': 'jade', 'color3': 'violeta'}

def play(check_every=15.0, use_auto=True, tmax=30 * 3600, timeline=False):
    """Bot: cada `check_every` segundos compra lo de mejor retorno (lo que haria un jugador atento);
    los autocompradores compran cada segundo lo suyo. Comprime apenas alcanza el umbral si esta mirando
    (o siempre, con compresion automatica)."""
    st = State(); t = 0.0; next_check = 0.0; ev = []; comps_t = []
    def log(msg):
        if timeline: ev.append((t, msg))
    seen = set()
    while t < tmax:
        dt = 0.2 if st.run_t < 300 else 1.0
        r = st.lograte()
        if r > -math.inf: st.E = addlog(st.E, r + l10(dt))
        st.G += st.flow() * dt; t += dt; st.run_t += dt
        st.max_ever = max(st.max_ever, st.E)
        while st.unlocked_colors < 4 and st.max_ever >= CFG['colores'][st.unlocked_colors]['desbloqueo_log10']:
            st.unlocked_colors += 1; log(f'desbloquea color {CFG["colores"][st.unlocked_colors - 1]["id"]}')
        if st.E >= INF:
            log('INFINITO'); return t, comps_t, ev
        human = t >= next_check
        if human: next_check = t + check_every
        auto = {it for it, key in AUTO.items() if use_auto and st.tier >= CFG['autocompradores'][key]}
        while True:
            best = None; r0 = st.lograte()
            for it, cost in st.shop():
                if cost > st.E or not (human or it in auto): continue
                trial = State.__new__(State); trial.__dict__ = {**st.__dict__, 'Lc': st.Lc[:], 'mut': dict(st.mut)}
                trial.apply(it); dl = trial.lograte() - r0
                if it == 'caudal': dl *= 2      # mas caudal tambien hace crecer la pila: vale ~doble
                if dl <= 1e-12: continue
                pay = 10 ** (cost - r0) / (10 ** dl - 1)
                if best is None or pay < best[0]: best = (pay, it, cost)
            if not best: break
            st.E = sublog(st.E, best[2]); st.apply(best[1])
            if best[1] not in seen: seen.add(best[1]); log(f'primera compra: {best[1]}')
        auto_comp = use_auto and st.tier >= CFG['autocompradores']['compresion_auto']
        if st.E >= st.next_threshold() and (human or auto_comp):
            st.tier += 1; comps_t.append(t)
            log(f'Compresion #{st.tier} (1e{CFG["compresion"]["umbrales_log10"][st.tier - 1]}) -> Densidad {st.D():.2f}, corrida de {st.run_t / 60:.1f} min')
            st.reset_run()
    return math.inf, comps_t, ev

if __name__ == '__main__':
    if '--timeline' in sys.argv:
        T, _, ev = play(15, timeline=True)
        for t, e in ev: print(f'{t / 60:7.1f} min  {e}')
    else:
        for ce in (5, 15, 60, 300):
            T, ct, _ = play(ce)
            runs = [round((b - a) / 60, 1) for a, b in zip([0] + ct, ct + [T])]
            print(f'revisa cada {ce:3d} s: Infinito a los {T / 60:5.0f} min | {len(ct)} compresiones | corridas {runs}')
