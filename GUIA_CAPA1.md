# Guía paso a paso — Capa 1 con Claude Code

Igual que con la Capa 0: un hito por sesión, en orden, probando el juego al final de cada uno. Usá **Fable 5.2** donde dice Fable (economía, three.js, offline, auditorías) y **Opus 5.5** en el resto.

---

## Paso 0 — Copiar los archivos (5 min, una vez)

Descomprimí `avalancha-capa1.zip` y copiá a tu repo:

| Del zip | A tu repo |
|---|---|
| `SPEC_CAPA1.md` | raíz (al lado de `SPEC.md`) |
| `GUIA_CAPA1.md` | raíz |
| `balance/config_capa1.json`, `balance/sim_capa1.py`, `balance/probe.py`, `balance/tune.py` | `balance/` |
| `balance/config_capa0_snapshot.json` | `balance/` (no reemplaza tu `config.json`) |

Abrí `CLAUDE.md` y pegá al final el contenido de `CLAUDE_CAPA1_agregar.md`.

## Paso 1 — Verificar el simulador (Opus)

```
Leé SPEC_CAPA1.md y CLAUDE.md. Corré `python3 balance/sim_capa1.py` (tarda unos minutos).
El simulador lee balance/config.json (la Capa 0 real del juego) y si le falta algo cae a
balance/config_capa0_snapshot.json, que es con la que se calibró la Capa 1.
1) Si da error por claves distintas en config.json, adaptá SOLO la lectura en sim_capa1.py, no los números.
2) Compará los tiempos con la tabla de la sección 2 de SPEC_CAPA1.md. Si difieren más de 0,3 h,
   corré también con la copia (renombrando temporalmente) y decime qué cambió en la Capa 0 que lo explica.
No toques código del juego todavía. Creá PROGRESO.md con una sección "Capa 1".
```

Lo que tenés que ver: "FIN 1.1 … ~6,96 h" y "FIN CAPA 1 … ~14,99 h". Si tu Capa 0 cambió (mutaciones, logros) puede moverse un poco; mientras quede en 6,5–7,5 h y 14–16 h, seguí.

## Paso 2 — C1: guardado, Cristales y navegación (Fable)

```
Hito C1 de SPEC_CAPA1.md (sección 16). Implementá:
- Guardado v2 con migración desde v1 (sección 13) y test de ida y vuelta.
- Moneda Cristales y Cristales totales (break_infinity), el Infinito nuevo de la sección 4 (sin Romper todavía:
  1e308 frena la Energía y da floor(10^(mult+0,35)) Cristales).
- Barra lateral de capas (Arena / Cristalización) y la segunda barra dentro de Cristalización
  (Red, Estratos, Defectos, Escarcha, Relicario) con pantallas vacías que solo dicen el nombre.
- La cinemática corta del primer Infinito (sección 11), simple por ahora.
La pila no se mueve nunca. Todo número desde config_capa1.json. Textos en el archivo de cadenas.
Al terminar: tests verdes, abrí el juego, llegá a un Infinito con una partida de prueba (hacé un botón de debug
oculto que dé 1e307 Energía) y verificá la migración con un guardado viejo. Actualizá PROGRESO.md.
```

## Paso 3 — C2: la Red (Opus)

```
Hito C2. La Red de la sección 6 de SPEC_CAPA1.md: nodos leídos de config_capa1.json (red.nodos; el anillo 3
existe en config pero queda bloqueado con candado de hielo hasta la Escarcha). Forma de rombo como el mapa de 6.1,
4 niveles pintados Ámbar/Coral/Jade/Violeta, apertura de vecinos al maxear (animación de derrumbe de la Capa 0),
costos de 6.2, efectos de 6.3. Memoria completa: autocompradores desde el inicio, Cascada auto, Mutaciones auto,
Infinito auto, conservar compresiones. Tooltip de cada nodo con efecto actual y siguiente.
Tests de la lógica (apertura, costos, efectos). Abrí el juego y probalo. PROGRESO.md.
```

## Paso 4 — C3: Relicario (Opus)

```
Hito C3. Relicario de la sección 5: ofertas con semilla guardada (relicario.semilla + número de Infinito;
recargar no cambia la oferta), nunca 3 iguales, elección automática a los 30 s o con Infinito auto,
fusión por floor(log3) con la escalera de colores y animación de 3 cristales que se juntan, engarces (espacios),
efectos de Cauce/Cascada/Mutaciones. Pantalla propia con las 3 pilas de reliquias y los espacios.
Test: misma semilla => mismas ofertas; fusión correcta en 1/3/9/27/81. PROGRESO.md.
```

## Paso 5 — C4: Estratos, lógica (Fable)

```
Hito C4. Lógica de los Estratos de la sección 7.2 y 7.3 de SPEC_CAPA1.md: s_k en log10, crecimiento por segundo de
Arena, tope s_(k-1)-2, Presión sumada a log10 V, compras con costo cúbico. Interfaz 2D PROVISORIA (lista de 8
filas con s_k, aporte y botones). Sumá la Presión al desglose de estadísticas.
Compará tu núcleo contra sim_capa1.py: escribí un test que con el mismo estado y 600 s de juego dé el mismo s_k
y la misma Presión (±1 %). PROGRESO.md.
```

## Paso 6 — C5: Estratos en 3D (Fable)

```
Hito C5. La escena three.js de la sección 7.4 de SPEC_CAPA1.md: descenso por los 8 estratos, sombra de la pila
arriba, losas translúcidas con heightmap 64x64, partículas, estratos cerrados como roca, interfaz HTML de cada
estrato al costado (reemplaza la provisoria) y la flecha "↓ Estratos" debajo de la pila. Cumplí TODA la lista de
optimización. Instalá three con versión exacta.
Al terminar medí: fps en la pantalla de Estratos y en la Arena después de entrar y salir 10 veces (no puede bajar
ni crecer la memoria). Probá en el celular. PROGRESO.md con los números medidos.
```

## Paso 7 — C6: Romper el Infinito (Fable)

```
Hito C6. Romper el Infinito (nodo Ruptura nv1) y la fórmula completa de Cristales de la sección 4 con el blando
sobre 1e50, Q, mult. Indicador "Cristales al hacer Infinito: X (Y/min)" con brillo en el óptimo, e Infinito
automático de Memoria nv4 con la regla del óptimo (configurable). Test contra infinity_reward de sim_capa1.py
con 5 casos. Ruptura nv1 es además la llave de los Estratos (el nodo Estratos pide `requiere: {ruptura: 1}`, ya en el
núcleo): al romper el Infinito, presentá los Estratos como "lo que te deja ir más allá del Infinito" y probá que el
softcap de la Arena sobre 1e308 (SPEC.md §4.11) se ve en la tienda con la gema "∞". PROGRESO.md.
```

## Paso 8 — C7: Defectos 1–4 (Opus)

```
Hito C7. Pantalla de Defectos y los 4 primeros de la sección 8 de SPEC_CAPA1.md con reglas, metas, requisitos,
recompensas y el visual de cada uno sobre la pila. Entrar sale de la corrida actual; abandonar sin castigo;
ganar da Cristales normales + recompensa. Leé las reglas exactas del modificador en sim_capa1.py (Arena.logV_parts,
lograte, D) para que el núcleo haga lo mismo. Tests de cada regla. PROGRESO.md.
```

## Paso 9 — C8: test de balance, offline y estadísticas (Fable)

```
Hito C8. tests/balance_capa1.test.ts de la sección 17 de SPEC_CAPA1.md, por ahora hasta el fin de la 1.1
(6,5–7,5 h). Offline de la sección 12 con test "12 h offline < 12 h activas". Estadísticas: desglose de log10 V
por fuente con %. Si el test de balance no da, NO cambies números: buscá la diferencia con sim_capa1.py y decime.
PROGRESO.md.
```

## Paso 10 — C9: pulido y auditoría de la 1.1 (Opus + Fable)

Con Opus: guías integradas y panel de ayuda con fórmulas para Red, Relicario, Estratos y Defectos; hito de fin de la 1.1 (celebración + "Escarcha: próximamente"); revisar textos.

Con Fable, sesión nueva:
```
Auditoría completa de la Capa 1.1 contra SPEC_CAPA1.md: bugs, números fuera de config, rendimiento (three.js),
guardado/migración, móvil, accesibilidad. Lista ordenada por gravedad, después arreglá lo grave.
```

**Momento de pulir lo visual**: acá, antes de publicar. Jugá la 1.1 entera a x10–x50 (el botón de velocidad de debug) y anotá lo que se sienta lento o confuso.

→ **Publicar la 1.1** en itch con changelog.

---

## Actualización 1.2

## Paso 11 — C10: Escarcha (Fable)
```
Hito C10. Escarcha de la sección 9 de SPEC_CAPA1.md: espesor logX, g con Presión, aporte y penalidad, romper
(cada 30 min mínimo, conserva 50 %, Esquirlas), mejoras Crecimiento/Brillo/Aguante, animación del hielo
hexagonal sobre la pila (sin tapar la arena: capa fina en los bordes que crece). Se desbloquea al llegar al
hito de la 1.1. Offline al 70 %. Test contra esc_params de sim_capa1.py. PROGRESO.md.
```

## Paso 12 — C11: anillo 3, Pulido, Deshielo (Opus)
```
Hito C11. Abrir el anillo 3 de la Red con la Escarcha (los nodos ya están en config), Pulido de reliquias con
Esquirlas (sección 5) y Deshielo (romper automático + Esquirlas x). Tests. PROGRESO.md.
```

## Paso 13 — C12: Defectos 5–8 (Opus)
```
Hito C12. Defectos Fatiga, Frontera, Inclusión y Vidrio de la sección 8, con requisitos de Cristales totales y
visuales. Mismas reglas que sim_capa1.py. Tests. PROGRESO.md.
```

## Paso 14 — C13: fin de la Capa 1 (Fable)
```
Hito C13. Fin de la capa en 1e308 Cristales totales: hito grande, pantalla "Capa 2 próximamente" y la silueta
de la Capa 2 en la barra lateral. Completá tests/balance_capa1.test.ts hasta el final (14–16 h, huecos < 40 min,
ninguna fuente > 65 %). PROGRESO.md.
```

## Paso 15 — C14: pulido y auditoría de la 1.2
Igual que el paso 10. → **Publicar la 1.2**.

---

### Si querés cambiar el balance
Pedile a Claude Code: "Quiero que X pase antes/después. Primero probalo en sim_capa1.py con tune.py, mostrame la tabla, y recién después cambiá config_capa1.json y SPEC_CAPA1.md". `tune.py` permite probar cambios sin tocar el archivo:
```
python3 -c "import tune; tune.run({'escarcha.g_por_presion': 0.002})"
```
