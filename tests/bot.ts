// Las compras de la Capa 1 del bot de balance (do_shop de sim_capa1.py), compartidas por los tests de balance de las Capas 1 y 2.
import {
  CFG1, MEJORAS_ESCARCHA, NODOS, abrirEstrato, comprarRed, costoAbrirLog10, costoMejoraEscarchaLog10, costoMejoraLog10, costoPulidoLog10,
  costoRedLog10, equipadas, mejorarEscarcha, mejorarEstrato, puedeAbrir, puedeComprarRed, puedeMejorar, puedeMejorarEscarcha, puedePulir, pulir,
  type MejoraEstrato, type State,
} from '../src/core'

/** do_shop de sim_capa1.py: lo más barato primero (en log10 de Cristales), con la prioridad del bot para algunos nodos. */
export function tienda(s: State, t: number, compras: number[]): State {
  const pr = CFG1.red.prioridad_bot
  for (;;) {
    const op: { c: number; hacer: (s: State) => State }[] = []
    for (const id of Object.keys(NODOS))
      if (puedeComprarRed(s, id)) op.push({ c: costoRedLog10(id, s.red[id]) - (pr[id] ?? 0), hacer: (x) => comprarRed(x, id) })
    if (puedeAbrir(s)) op.push({ c: costoAbrirLog10(s), hacer: abrirEstrato })
    for (let k = 0; k < s.estratos.abiertos; k++)
      for (const q of ['perm', 'pres'] as MejoraEstrato[])
        if (puedeMejorar(s, q, k)) op.push({ c: costoMejoraLog10(q, k, s.estratos[q][k]), hacer: (x) => mejorarEstrato(x, q, k) })
    if (!op.length) return s
    s = op.reduce((a, b) => (b.c < a.c ? b : a)).hacer(s)
    compras.push(t)
  }
}

/** La segunda mitad de do_shop: con Esquirlas, lo más barato primero entre las mejoras de la Escarcha y pulir una pieza engarzada. */
export function esquirlas(s: State, t: number, compras: number[]): State {
  for (;;) {
    const op: { c: number; hacer: (s: State) => State }[] = []
    for (const k of MEJORAS_ESCARCHA)
      if (puedeMejorarEscarcha(s, k)) op.push({ c: costoMejoraEscarchaLog10(k, s.escarcha.mejoras[k]), hacer: (x) => mejorarEscarcha(x, k) })
    for (const p of equipadas(s)) if (puedePulir(s, p.id)) op.push({ c: costoPulidoLog10(s, p.nivel), hacer: (x) => pulir(x, p.id) })
    if (!op.length) return s
    s = op.reduce((a, b) => (b.c < a.c ? b : a)).hacer(s)
    compras.push(t)
  }
}
