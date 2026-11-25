# Capa 1 · Defectos

Núcleo: `src/core/defectos.ts`. UI: `src/ui/Defectos.svelte`, `src/ui/defectos.ts`, `grietas.ts`. Config: `config_capa1.json → defectos.*` (reglas, metas, recompensas, abandono). Fixture: `balance/ref_defectos.py` → `tests/defectos.test.ts`.

## Reglas generales

- Se entra desde su pantalla (sale de la corrida actual, sin Cristales). Se gana al llegar a la **meta** de Energía: termina como un Infinito (Cristales normales de ese Infinito; bajo 1e308, los de un Infinito sin romper), una reliquia y la recompensa permanente.
- Abandonar cuando quieras: sin castigo, sin Cristales ni reliquia.
- **El Infinito, a mano o automático, no saca de un Defecto.** Offline dentro de un Defecto no avanza nada.
- Dentro de cada grupo, en orden.

| # | Defecto | Regla | Meta (log10 E) | Recompensa | Requisito |
|---|---|---|---|---|---|
| 1 | **Vacancia** | Violeta no multiplica (se compra, no suma; el autocomprador no lo compra) | 237 | Hito de color ×4 → ×6 | Defectos nv1 |
| 2 | **Dislocación** | Cascada c × 0 y Presión ×0,5 | 1347 | Mult. por anillo ×1,10 → ×1,12 | Defectos nv2, 3 estratos |
| 3 | **Macla** | Sin Mutaciones, Densidad ×0,85 | 1816 | Crecimiento cuadrático de colores ×0,9 | Defectos nv3, 5 estratos |
| 4 | **Impureza** | Derrumbes por grano con tope 1e4, colores ^0,5 (Cauce incluido) | 3471 | Cascada +0,1 de c | Defectos nv4, 7 estratos |
| 5 | **Fatiga** | Producción ÷10 cada 10 min de corrida (`−t/600`; la Compresión reinicia el reloj) | 11464 | Escarcha crece ×2 | Defectos II nv1, 1e60 Cristales totales |
| 6 | **Frontera** | Densidad = 1 | 7067 | Densidad +0,2 | Defectos II nv2, 1e80 |
| 7 | **Inclusión** | La Presión no funciona | 23500 | Punto de ruptura de la Escarcha ×1,5 | Defectos II nv3, 1e105 |
| 8 | **Vidrio** | Sin Relicario, Eco, Escarcha, estratos quietos, sin bonos de Cristales de la Red | 41518 | Cristales ×1000 | Defectos II nv4, 1e150 |

## Cómo se calibraron las metas

Con `balance/probe.py`: el jugador de la tabla de [bucle_y_balance.md](bucle_y_balance.md), en la hora de cada Defecto, juega sin meta; la meta es lo que alcanza a los **30 min** (rango 20–40). Inclusión a ~25 min (se aplana entre 30 y 40) y Vidrio a ~20. Si cambia una meta, volver a medir con `probe.py`.

Ojo: más allá de 1e308 la curva dentro de un Defecto es casi plana (E ≈ cte + log t): lo decide sobre todo el estado con que se entra. La Vacancia (antes de Romper) sí tiene una curva real.

## Abandono y reintento

Al abandonar, el juego sugiere volver con ~×30 Cristales totales (`reintento_cristales_totales_log10` = 1,5). Los bots abandonan desde los 10 min si al ritmo de los últimos 3 min la meta queda a más de 30 min, o a los 45 min (`abandono_revisar_min`, `abandono_ventana_min`, `abandono_meta_max_min`). Los abandonos se cuentan (logro secreto Terco).

## Cómo se ve

- Multiplicadores cambiados visibles en la Arena (debajo de los contadores) y en la ficha: el valor adentro y, tachado, el de afuera. Cartel del Defecto actual en la Arena.
- Cada Defecto deforma la pila: grieta (Vacancia, núcleo oscuro con bordes de luz ≥ 2,5 px CSS), corrimiento (Dislocación), espejo (Macla), manchas con borde oscuro (Impureza), pulso que se apaga (Fatiga, con cuenta al próximo ÷10), bordes duros (Frontera, Densidad 1 con la de afuera tachada), burbujas (Inclusión), pila de vidrio sin color (Vidrio).
- En la Vacancia Violeta aparece agrietado y tachado.
- Pestañas Defectos / Defectos II.
