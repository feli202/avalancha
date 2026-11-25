# Actualización final de la Capa 1 (versión 1.0)

Copiá el bloque entero en Claude Code (Fable 5.2 si podés; si no, Opus 5.5), con esta carpeta en la raíz del repo.

````
Leé CLAUDE.md, PROGRESO.md, SPEC.md y SPEC_CAPA1.md. Mirá el código actual. Después leé la carpeta
actualizacion-final-capa1/ de la raíz: este archivo, la partida partida_trabada_antes_del_infinito.txt (es un
export real, en base64) y las capturas de capturas/. Esta es la actualización final de la Capa 1: la versión 1.0.
Hacé los bloques en orden, con un commit por bloque. Si un bloque toca el balance, primero el simulador.

BLOQUE 1 — BUG: EL INFINITO SE TRABA EN 99 % (nos pasó a dos jugadores varias veces)
Síntomas: cerca de 1e308 la barra del Infinito queda en 99 % y no deja hacer Infinito; a veces el botón de Cascada
queda congelado. En la partida adjunta estuvo trabada 20 minutos y se destrabó al recargar con Shift+R.
Pista ya encontrada: en esa partida la Energía guardada es [1.797628728208384, 308] = 1,797628e308, que es
10^308,2547 (el INF de config). El umbral del Infinito probablemente es Number.MAX_VALUE = 1,797693e308. El tope
queda un pelito por DEBAJO del umbral y nunca se llega.
1) Importá la partida adjunta y reproducilo. Confirmá la causa (y si hay otra, también).
2) Arreglo: un solo número para el Infinito, definido en un único lugar, usado por el tope de la Energía, la
   condición (>=), la barra y el porcentaje. Que la barra muestre 100 % y el Infinito quede disponible apenas se
   llega al tope.
3) Revisá también: valores grandes que pasan a número común de JS (toNumber(), Math.*, Number()) y se vuelven
   Infinity o NaN pasado ~1,8e308; el botón de Cascada (estado deshabilitado que no se recalcula, choque entre compra
   manual y autocomprador, nivel máximo: la partida tiene Cascada nivel 10 y Cascada+ en 0); y por qué al recargar
   se destraba (¿estado en memoria que no se actualiza?).
4) Protección general: si un valor de la economía da NaN o Infinity, se registra en la consola y el juego no se
   traba (vuelve al último valor válido).
5) Tests de regresión: la partida adjunta, y partidas con Energía en 1e307, 1e308, el tope exacto, 1e309 y 1e400,
   con y sin Romper el Infinito y con y sin autocompradores (hacer Infinito y comprar Cascada en cada una).
6) Botón "Reportar un problema" en Ajustes: copia la partida exportada, la versión y los últimos errores de la
   consola, con un texto que diga que lo pegues en el canal de bugs del Discord.

BLOQUE 2 — LA PARTIDA NUNCA SE PIERDE
Guardado automático cada 30 s y al cerrar u ocultar la pestaña; 3 respaldos locales rotativos (los últimos 3
guardados válidos) recuperables desde Ajustes; validar cada guardado antes de escribirlo (si da NaN o está
corrupto, no pisa el bueno); Exportar e Importar bien visibles en Ajustes. Tests.

BLOQUE 3 — UN SOLO NOMBRE: "Avalancha"
El juego se llama "Avalancha" en todos lados y en todos los idiomas (también en inglés): título de la página,
manifest de la app, textos, créditos, README, metadatos para compartir. Buscá "Avalanche" en todo el repo y
reemplazalo, salvo URLs externas que no dependen de nosotros (decime cuáles quedan).

BLOQUE 4 — NOTACIONES DE NÚMEROS
Selector en Ajustes → Juego, guardado en la partida. Todos los números del juego pasan por un único formateador.
- Importantes: Científica (1,23e308) · Ingeniería (123,4e306) · Letras (K, M, B, T, Qa, Qi… y después aa, ab…) ·
  Estándar en palabras (mil, millones… / thousand, million…, según el idioma) · Logarítmica (e308,09) · Mixta
  (estándar hasta 1e33 y científica después).
- Raras y troll (divertidas, pero que funcionen con cualquier número):
  · "Pila": el exponente en base 4 (4 granos derrumban una celda) con los 4 cuadraditos de color del juego:
    Jade = 0, Violeta = 1, Coral = 2, Ámbar = 3. Ej.: 1e308 → exponente 308 = 10310 en base 4.
  · "Arena de la Tierra": comparado con los granos de arena de todas las playas de la Tierra (~7,5e18):
    "×1,3e289 Tierras de arena".
  · "Romanos" (con sobrerrayado para los miles, y "demasiado para Roma" cuando no da).
  · "Binario".
  · "Una banda" (en inglés "A lot"): textos vagos según el tamaño ("poquito", "bastante", "una banda", "una bocha",
    "infinito y más allá"); en inglés con su propio chiste.
  · "Ciego": no muestra ningún número.
Tests del formateador con 0, números chicos, 1e308, 1e1000 y NaN.

BLOQUE 5 — INGLÉS NATURAL
Revisá TODOS los textos en inglés del archivo de cadenas para que suenen escritos por un nativo, con la
terminología del género. Anotá en marketing/textos_en_dudas.md las frases dudosas para que las revise una persona.

BLOQUE 6 — FINAL DE LA CAPA 1
Al llegar a 1e308 Cristales totales, además de la cinemática y "Capa 2 próximamente": pantalla de resumen de la
partida (tiempo jugado, Infinitos, Defectos, mayor avalancha, reliquia más alta, foto de tu pila), descargable como
imagen para compartir, con el logo de Avalancha y el link del juego. Debajo, los links a Discord e itch.io.

BLOQUE 7 — COMUNIDAD: DISCORD E ITCH.IO
- Links: Discord https://discord.gg/8qEt7E6AV · itch.io https://exponent-games.itch.io
- En Ajustes → Créditos, arriba de todo, los dos links con sus íconos.
- También en el final de la Capa 1 y en "Reportar un problema" (Discord).
- Pop-up de comunidad: la primera vez que se juega esta versión, a los 10 minutos de juego activo (para todos:
  jugadores nuevos y los que ya venían), aparece una tarjeta con la estética del juego: "Este es nuestro server de
  Discord y nuestra cuenta de itch.io. Nos ayuda muchísimo que apoyes el desarrollo siguiéndonos y sumándote al
  Discord." con dos botones (Discord, itch.io) y "Ahora no". Una sola vez por dispositivo, nunca encima de un
  pop-up de reliquias ni de una cinemática. En inglés, el mismo texto bien traducido.

BLOQUE 8 — ESTADÍSTICAS ANÓNIMAS Y PRIVACIDAD
- Implementá estadísticas que respeten la privacidad (Plausible o GoatCounter), sin cookies ni datos personales,
  detrás de una configuración: si todavía no hay cuenta, dejalo listo y desactivado, y decime qué tengo que crear
  y dónde pegar el dato.
- Eventos: primera compra, primera compresión, cada 5 compresiones, primer Infinito, Romper, cada Defecto, fin de la
  1.1, fin de la Capa 1, con el tiempo de juego en cada uno. Interruptor "Enviar estadísticas anónimas" en Ajustes,
  activado por defecto, respetando Do Not Track.
- Política de privacidad corta, en español e inglés, en Ajustes → Créditos y como página del sitio.

BLOQUE 9 — PILA Y ESTRATOS EN CELULAR (capturas 01, 02, 03)
- Sacá el botón "↓ Estratos" que aparece sobre la pila: se ve roto y no hace falta (a los Estratos se entra por la
  pestaña de Cristalización).
- La pantalla de Estratos en celular queda chica y torcida: rediseñá el encuadre para celular (390x844 y 360x640):
  el embudo centrado, recto, grande, ocupando el ancho disponible, legible.
- Se tiene que ver el final del embudo: debajo del estrato 8, el noveno, vacío, como el fondo cerrado del embudo
  (sin compras ni texto por ahora; en la Capa 2 va a ser el Horno). Visible en celular y en PC.

BLOQUE 10 — INFINITO AUTOMÁTICO (capturas 04 y 06)
- Sacá el modo "En el óptimo": no funciona bien (después de una compresión todo se reinicia y calcula mal).
- Modo nuevo "Multiplicar mis Cristales": hace Infinito cuando lo que daría el Infinito es N veces tus Cristales
  actuales (N configurable, por defecto ×10). Así, con ×10, va 1 → 10 → 100 → 1.000…
- Quedan "Apenas llegás" y "Al llegar a X Cristales".
- El campo de X Cristales (y el de N) acepta notación científica: 1e12, 1E12, 1,5e30, y también 1000000. En celular
  tiene que abrir un teclado con letras (no el numérico), validar lo escrito y mostrar cómo lo entendió ("= 1e12").
- Que se aplique igual en el bot del simulador y en el del test de balance.

BLOQUE 11 — NODO DEFECTOS DE LA RED (captura 05)
El nivel 1 está bien. Los niveles 2, 3 y 4 abren Defectos demasiado temprano, cuando todavía no se pueden completar.
Subí el costo de esos niveles (o su requisito) para que cada Defecto se abra cerca del momento en que se puede
completar, según la tabla de la sección 2. Sin análisis largo: una corrida del simulador para confirmar que la
tabla sigue en rango alcanza.

BLOQUE 12 — CAPTURAS Y ARCHIVO PARA ITCH (en marketing/itch/)
- Capturas del build de producción con Playwright (deviceScaleFactor 2) y partidas de debug, sin el botón de debug
  ni nada roto: portada 630x500 y 1260x1000 (la pila grande con el título "Avalancha"); 6 capturas 1920x1080 en
  inglés y en español (pila temprana, mandala grande con números enormes, la Red, los Estratos, el pop-up de
  reliquias, un número más allá del Infinito); 3 de celular 1080x1920 (Arena, Red, Estratos); un GIF de 5–8 s, 600 px
  de ancho, de una avalancha grande. Mirá cada una antes de entregarla.
- Archivo para subir a itch.io: marketing/itch/avalancha-web.zip con el build de producción, index.html en la raíz
  del zip y todas las rutas relativas, probado dentro de un iframe como lo sirve itch.

AL FINAL
- Tests verdes (incluido el de balance) y build sin errores. Prueba en 390x844, 360x640 y PC: nada superpuesto.
- PROGRESO.md, SPEC_CAPA1.md y changelog actualizados (changelog de la versión 1.0, en español e inglés, listo para
  pegar en itch).
- Commit en main y push a GitHub. Esperá a que se publique en feli202.github.io y confirmame.
- Decime qué quedó pendiente (por ejemplo, la cuenta de estadísticas) y dónde está el zip para itch.
````
