## Escalado e Ignición

### Escalado después de la primera Fundición

La primera vuelta es larga y despareja a propósito; desde la segunda, las compras repetibles crecen mucho más y la vuelta se vuelve rápida.

- Estratos: cada nivel de Permeabilidad rinde ×(1 + 0,3 · Fundiciones), con softcap a las 20 Fundiciones (pasadas 20, cuenta la raíz). La Presión (el peso) no escala: con ×(1 + 0,5 · F) en las dos, la Presión llegaba al 90 % de la producción. Los estratos se abren llenos desde el inicio de cada vuelta: con el nodo Estratos nv1 se abren los 8 juntos, con s_8 = 291 y cada uno 2 (la separación) más que el de abajo.

- Compras con Esquirlas: aparecen dos repetibles nuevas: Esquirla de fuego (la Temperatura de las Brasas ×1,01 por nivel) y Geoda (Esquirlas/s ×2 por nivel). El nivel L cuesta 10^(1 + L); sin tope. Son permanentes; el bot las compra con lo que sobra después de las mejoras de la Escarcha. Con un paso de costo menor a 1 la Esquirla de fuego arma un bucle Temperatura → Escarcha → Esquirlas → Temperatura que adelanta la Ignición horas.

- Cristales: con Fusión del Infinito los Cristales pasan de 1e308 con el freno de [fundicion.md](fundicion.md); en el simulador llegan a e450 a las 6:40, e520 a las 8:00, e700 a las 9:30 y ~e1.000 en la Ignición.

- Regla: ninguna vuelta después de la quinta debería durar más de 20 minutos activos; las últimas, 3–5 minutos. En el simulador: vueltas 2.ª a 4.ª de 33, 29 y 25 min; entre las 4:00 y la Fusión (5:26) duran 1,5–2 min (sin Fusión cada Fundición da lo mismo, así que conviene fundir seguido); después, 6–8 min, y desde las 9:33 todas ≤ 5 min.

### Cómo quedó el Escalado (fase 9, solo en la beta)

- **Fusión del Infinito** (`src/core/infinito.ts`): `topeCristales(s)` da `Decimal.MAX_VALUE` con el fuego de Ruptura (el mismo lugar y el mismo número de la fase 1A sin él). `cristalesAlInfinito` aplica `frenoCristales` (`fuego.ts`, = `soft_cristales` del simulador) después del blando de la Capa 1. Las Brasas ya escalan solas (`brasasAlFundir` lee log10 de los Cristales totales); **Fusión** (Ruptura II) multiplica el exponente 5,2 × 1,387. Ojo: con la partida real, un Infinito con 1e5000 de Energía da 1e44 Cristales (el blando); para pasar de 1e308 hace falta Energía del orden de 1e10^6.
- **Más de 1e308**: Cristales, Cristales totales y Energía son `Decimal` en todo el núcleo y la interfaz los lee con `log10()`/`formato` (mantisa y exponente); no hay `toNumber()` sobre ellos. `tests/escalado.test.ts` corre la partida real con 1e309, 1e1000, 1e100000 y 1e1000000 (ticks, Infinito, Fundición, desgloses, las 12 notaciones, guardar/cargar, topar sin Fusión) sin Infinity ni NaN.
- **Permeabilidad**: `escaladoPermeabilidad(s)` en `estratos.ts` (×(1 + 0,3 F), raíz pasadas 20), solo en el término de la Permeabilidad de `gammaEstrato`. Estratos llenos: desde la fase 5 (`abrirLlenos`).
- **Esquirla de fuego y Geoda** (`fuego.compras` en la partida): `comprarEsquirla` / `costoEsquirla` (10^(1 + L) Esquirlas) en `fuego.ts`, visibles desde la primera Fundición en la pantalla de la Escarcha, de a dos debajo de sus mejoras. Esquirla de fuego multiplica el término de las Brasas de `temperatura`; Geoda, `esquirlasPorSegundo`. Se compran a mano (Deshielo automático compra solo las tres mejoras de la Escarcha).
- **Fundición automática**: interruptor `fundicion` (en `AUTOS`, arranca apagado: fundir reinicia dos capas) y `automat.fundicion` (`modo` 'llegar' | 'multiplicar', `x` el factor de las Brasas totales, 1,223 por defecto = 1 + `bot_multiplicar_x`). Aparece en Reinicios desde la primera Fundición y se activa con Memoria eterna. `fundicionAutoLista` en `fuego.ts`; `tick` funde sin cinemática (no fuera de línea ni dentro de un Defecto) y la interfaz avisa "Fundición automática: +N Brasas" y guarda. Sin Fusión, "multiplicar" funde apenas llega (como el Infinito sin Romper). La espera del bot (30 min por un nodo pagable, 5 min como mucho) no está en el juego.
- Tests contra el simulador: `balance/ref_capa2.py` → `tests/fixtures/capa2_escalado.json` (freno, Brasas, Temperatura, Esquirlas/s, costos, escalado, Vidrio/s y flujo).

### Ignición (5.778 K, el fin de la Capa 2)

- Al llegar a 5.778 K (la temperatura de la superficie del Sol) la pila deja de ser arena fundida: se vuelve plasma. En el simulador, a las 9:56, con 107 Fundiciones y ~10^5 Brasas totales.

- Cinemática: el Horno se pone blanco, la pila se ilumina desde adentro, los granos dejan de caer en cruz y por un instante caen también en diagonal; el borde de la pila se curva hasta formar un círculo y aparece, apenas un segundo, el símbolo π. Corte a negro: "Capa 3 próximamente".

- Pantalla de resumen como la de la Capa 1 (tiempo, Fundiciones, Temperatura máxima, Vidrio, foto de la pila en plasma), descargable, con links a Discord e itch.io.

- Puente a la Capa 3: en la barra lateral aparece la silueta de la Capa 3 (un círculo). La Capa 3 cambia las físicas de la pila (derrumbes en diagonal), toca el espacio y el tiempo, y π es clave en lo simbólico y en lo jugable. En la Capa 2 solo se insinúa: nada de mecánicas de la Capa 3 todavía.

### Cómo quedó la Ignición (fase 10, solo en la beta)

- **Núcleo**: `ignicion(s)` en `fuego.ts` (Temperatura ≥ `temperatura.ignicion`). La Temperatura nunca baja, así que la de ahora es la máxima.
- **Disparo** (`juego.svelte.ts`, `ignicionYa`): con la marca de beta, la primera vez que se llega (`vistos.capa3`, en el guardado; si se cierra la página antes de que termine, se repite). Espera a que no haya cartel ni otra cinemática (la de la Fundición termina primero). Una partida beta que ya pasó 5.778 K la ve al entrar.
- **Cinemática** (`juego.cinematica = 'ignicion'`, `IGNICION_MS` = 10 s): en `Pila.svelte`, 0–1,6 s el Horno (un resplandor desde abajo) pasa de naranja a blanco; 1–3 s la pila se ilumina desde adentro (luz en `screen`); 2,4–4,8 s los granos se derrumban en cruz (ámbar) y entre 3,4 y 4,3 s también en diagonal (violetas); 4,4–5,6 s el borde, un rombo, se curva hasta ser un círculo; 5,5–6,6 s π, apenas un segundo. La Ignición llega casi siempre al fundir, con la pila vacía: el plasma toma al menos 20vmin de radio. A los 6,6 s, corte seco a negro con "Capa 3 · Próximamente" (`App.svelte`). Con "Reducir destellos": la luz y el Horno suben despacio y más tenues, sin granos, el borde aparece ya redondo, π aparece y se va, y el negro es un fundido de 1 s.
- **Resumen** (pantalla `capa3` de `Capas.svelte`, la misma placa que el de la Capa 1): tiempo jugado, Fundiciones, Temperatura máxima, Vidrio, la imagen descargable (`imagenResumen(2)` en `resumen.ts`: la pila con la paleta de plasma y la luz blanca y violeta detrás; si la pila de ahora está casi vacía, la última instantánea buena, la misma que da la cara a las reliquias) y Discord / itch.io.
- **Silueta de la Capa 3** en la barra de capas: un círculo oscuro con el borde de plasma latiendo lento (quieto con Reducir destellos). Lleva a la pantalla del resumen. Ninguna mecánica de la Capa 3.
- **Test de balance** de punta a punta: `tests/balance_capa2.test.ts` (`npm run test:capa2`), el bot de `sim_capa2.py` portado al núcleo real (mismas decisiones: cargas, reparto del Motor, compras de fuego, cuándo fundir) contra la tabla de [ritmo_balance.md](ritmo_balance.md). Da 20/20 hitos, Ignición a las 9:55 (simulador 9:56) y la fuente más pesada en 39,5 %; falla el hueco máximo (34,4 min), como en el simulador (34,8). Tabla en `PROGRESO.md`.
- **Primer Infinito de cada vuelta** (arreglo de la fase 10): da los Cristales normales (2 al empezar), como `sim_capa2.py`; `primer_infinito` (1) es solo el primero de la partida (`cristalesAlInfinito`, sin Fundiciones). Con 1 en cada vuelta el nodo Estratos llegaba un Infinito más tarde y la capa se atrasaba ~1 h (Ignición a las 11:03).
- **Estratos llenos** (arreglo de la fase 10): desde la primera Fundición `puedeAbrir` es falso; los 8 los abre `abrirLlenos` en el tick. Antes, comprando el nodo Estratos y las aperturas en la misma pasada (el bot), quedaban abiertos sin llenar toda la vuelta.
