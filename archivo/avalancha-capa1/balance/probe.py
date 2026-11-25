"""Mide que Energia alcanza cada Defecto en N minutos con el estado del jugador a cierta hora."""
import copy, sys, json, sim_capa1 as S
def snapshots(times, tmax=16 * 3600):
    snaps = {}; orig = S.play_arena
    clock = {'t': 0.0}
    def hook(P, defect, check, t_now, stats):
        for T in times:
            if T not in snaps and clock['t'] >= T * 3600: snaps[T] = copy.deepcopy(P)
        r = orig(P, defect, check, t_now, stats); clock['t'] += r[0]; return r
    S.play_arena = hook
    try: S.simulate(tmax=tmax)
    finally: S.play_arena = orig
    return snaps
def probe(P, defect, minutes):
    P = copy.deepcopy(P); S.L1['defectos']['abandono_min'] = minutes
    meta = S.L1['defectos'][defect]['meta_log10']; S.L1['defectos'][defect]['meta_log10'] = 1e9
    st = dict(rupturas_escarcha=0)
    dur, A, ok = S.play_arena(P, defect, 15, 0, st)
    S.L1['defectos'][defect]['meta_log10'] = meta; S.L1['defectos']['abandono_min'] = 45
    return round(A.maxE, 1)
if __name__ == '__main__':
    plan = json.loads(sys.argv[1])  # {"dislocacion": 4.0, ...}
    snaps = snapshots(sorted(set(plan.values())))
    for d, T in plan.items():
        if T in snaps: print(d, T, {m: probe(snaps[T], d, m) for m in (10, 20)}, 'normal', probe(snaps[T], None, 20) if False else '')
        else: print(d, T, 'sin snapshot')
