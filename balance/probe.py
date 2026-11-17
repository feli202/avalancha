"""Mide que Energia alcanza cada Defecto con el estado del jugador a cierta hora.

    python3 probe.py '{"vacancia": 2.18, "dislocacion": 3.53}'

Saca una foto del jugador de referencia (revisa cada 15 s) a esa hora, le quita ese Defecto y los
siguientes de los completos (para no contar su recompensa) y juega el Defecto sin meta y sin abandonar:
imprime la mejor log10 E a los 1, 5, 10, 20, 30 y 40 minutos. La meta se elige entre la de 20 y la de 40 min.
"""
import copy, sys, json, sim_capa1 as S

MINUTOS = (1, 5, 10, 20, 30, 40)

def snapshots(times, tmax=16 * 3600):
    snaps = {}; orig = S.play_arena
    clock = {'t': 0.0}
    def hook(P, defect, check, t_now, stats):
        for T in times:
            if T not in snaps and clock['t'] >= T * 3600: snaps[T] = copy.deepcopy(P)
        r = orig(P, defect, check, t_now, stats); clock['t'] += r[0]; return r
    S.play_arena = hook
    try: S.simulate(tmax=max(times) * 3600 + 600)
    finally: S.play_arena = orig
    return snaps

def curva(P, defect, minutos=MINUTOS):
    """mejor log10 E del Defecto a cada minuto pedido (sin meta, sin abandonar)"""
    P = copy.deepcopy(P)
    grupo = S.DEFS[S.DEFS.index(defect) // 4 * 4:][:4]
    P.done -= set(grupo[grupo.index(defect):])
    D = S.L1['defectos']; meta, cap = D[defect]['meta_log10'], D['abandono_min']
    D[defect]['meta_log10'] = 1e9; D['abandono_min'] = max(minutos)
    S.CURVA, S.ABANDONA = [], False
    try: S.play_arena(P, defect, 15, 0, dict(rupturas_escarcha=0))
    finally:
        cur = S.CURVA; S.CURVA, S.ABANDONA = None, True
        D[defect]['meta_log10'], D['abandono_min'] = meta, cap
    return {m: round(max(e for t, e in cur if t <= m * 60), 1) for m in minutos}

def probe(P, defect, minutes):
    return curva(P, defect, (minutes,))[minutes]

if __name__ == '__main__':
    plan = json.loads(sys.argv[1])
    snaps = snapshots(sorted(set(plan.values())))
    for d, T in plan.items():
        if T not in snaps: print(d, T, 'sin snapshot'); continue
        P = snaps[T]
        print(f'{d:12s} {T:5.2f} h  estratos {P.est_open}  Defectos nv{P.red["defectos"]}  Ctot 1e{P.Ctot:.1f}  meta {S.L1["defectos"][d]["meta_log10"]}  ',
              '  '.join(f'{m}m {e:.0f}' for m, e in curva(P, d).items()), flush=True)
