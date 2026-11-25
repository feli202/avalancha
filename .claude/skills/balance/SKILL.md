---
name: balance
description: Correr y cambiar el balance de Avalancha (simuladores sim.py y sim_capa1.py, probe.py, tests de balance). Usar cuando un cambio toca números de balance, metas de Defectos, costos, efectos de nodos, o cuando hay que verificar que el balance no se movió.
---

# Balance

En esta máquina es `python`, no `python3`. Constantes solo en `balance/config.json` (Capa 0) y `balance/config_capa1.json` (Capa 1).

**Orden obligatorio si un cambio toca el balance**: simulador → doc del sistema en `docs/` (y la tabla de `docs/capa1/bucle_y_balance.md` o `docs/capa0/economia.md`) → config y código → tests. Nunca al revés. Todo efecto que escale con Cristales va primero al simulador.

## Verificar

| Qué | Comando | Debe dar |
|---|---|---|
| Capa 0 | `python balance/sim.py` (`--timeline` para la línea de tiempo) | Atento 3 h 28 min, 17 compresiones (tabla de `docs/capa0/economia.md`) |
| Capa 0 en el núcleo | `npx vitest run tests/balance.test.ts --reporter=verbose` | rangos del test (entra en `npm test`) |
| Capa 1 | `python balance/sim_capa1.py --robustez` (tarda minutos: correr en segundo plano) | tabla de `docs/capa1/bucle_y_balance.md` ±0,1 h (fin 1.1 7,39 h, fin de la capa 15,12 h, hueco < 40 min) |
| Capa 1, solo 15 s | `python balance/sim_capa1.py` | columna de 15 s |
| Primeros Infinitos | `python balance/sim_capa1.py --primeros 12` | qué compra el bot en cada Infinito |
| Capa 1 en el núcleo | `npm run test:lento` (~45 s, no entra en `npm test`) | 20/20, ±10 % |

## Metas de Defectos

`python balance/probe.py '{"vacancia": 2.18, "dislocacion": 3.53}'` (Defecto → hora del jugador) mide hasta dónde llega el jugador en un Defecto a una hora dada; la meta es lo que alcanza a los 30 min (rango 20–40). Usarlo si cambia una meta o lo que la afecta. Después regenerar fixtures si corresponde.

## Fixtures de referencia (regenerar si cambia la fórmula)

`balance/ref_cristales.py`, `ref_defectos.py`, `ref_estratos.py`, `ref_escarcha.py` escriben los fixtures que comparan `tests/cristales|defectos|estratos|escarcha.test.ts` contra el núcleo.

Al terminar: anotar en `PROGRESO.md` qué se cambió y los tiempos nuevos.
