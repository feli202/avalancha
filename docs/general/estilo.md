# Estilo: visual, sonido, accesibilidad y textos

## Reglas fijas

- **Pantallas sin scroll**: cada pantalla entra entera en 1366×768 y 390×844 (también 360×640). Una lista larga scrollea solo su caja.
- **Valores como multiplicadores o notación matemática** (×3, ^1,015, +0,02 a c, × (1 + 0,3 × nivel)), nunca porcentajes.
- **Textos** en español rioplatense e inglés, solo en `src/strings/es.ts` y `en.ts` (nunca en componentes). El nombre es "Avalancha" en todos los idiomas. Dudas del inglés: `marketing/textos_en_dudas.md`.
- La pila no se mueve nunca por la interfaz.
- Nada "de IA": sin tarjetas con sombra y gradiente genéricas, sin emojis, sin `backdrop-filter`.

## Identidad visual

- Fondo azul noche casi negro `#07080F` con viñeteado suave.
- Colores de interfaz: Ámbar `#FFB547`, Coral `#FF6B6B`, Jade `#2DD4A7`, Violeta `#9B7BFF`.
- En la pila el brillo va al revés de la frecuencia: Ámbar (3 granos, ~59 %) arena al atardecer `#8A5320` sin luz propia, Coral `#A4574F`, Jade `#3FE0B4` y Violeta `#C2A8FF` con luz propia. Paletas alternativas (logros, daltonismo) en `src/render/paletas.ts`.
- Arena seca: grano de 3 px CSS contrastado con granos sueltos de 7 px más claros (`lienzo.ts`).
- Tipografía Space Grotesk (`@fontsource/space-grotesk`), cifras tabulares.
- Arena: una sola familia de controles (la de la tienda: pestañas de texto con línea, sin tarjetas, píldoras ni vidrio). Capa 1: placas de hielo y gemas ([../capa1/interfaz.md](../capa1/interfaz.md)).
- Animaciones CSS continuas solo con `transform`/`opacity` (nada de animar `text-shadow`, `filter`, `box-shadow`).

## Sonido (`src/ui/sonido.ts`, todo Web Audio, sin archivos)

- Escala pentatónica de Re para todo lo tonal.
- Derrumbes: textura granular cálida, volumen/largo/tono según la avalancha; los seguidos bajan de volumen. Avalanchas grandes: golpe grave con cola. Compras: campana distinta por color. Hitos: acorde breve. Compresión: implosión y acorde. Infinito: crescendo, silencio y acorde.
- Música generativa (pad) que gana una capa por color desbloqueado.
- Lo automático no suena; como mucho 4 sonidos a la vez; el mismo no se repite antes de 80 ms; "Comprar todo"/"Máx" suenan una vez.
- Volúmenes general / efectos / música. Arranca con la primera interacción. El AudioContext se suspende tras 4 s sin sonido (sin música o volumen 0).

## Accesibilidad

- **Reducir destellos** (Ajustes → Juego, prendido por defecto): compras automáticas sin destello ni sonido, nada cambia de brillo más de 3 veces por segundo. La pila no se toca.
- **Reducir movimiento** (aparte; por defecto sigue `prefers-reduced-motion`): apaga destellos de la pila, escarcha, reflejos, rotación del marco; en `<html>` deja los bucles CSS en una vuelta y transiciones instantáneas.
- Paleta para daltonismo (las alturas también se distinguen por brillo).
- Todo jugable con teclado. Botones táctiles de 44 px en el celular.
