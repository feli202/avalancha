# Distribución: web, PWA, versión, comunidad

Procedimientos paso a paso: skills `/publicar-pages` y `/zip-itch` (`.claude/skills/`). Checklist de lanzamiento de la 1.0: `release/CHECKLIST.md`.

## Dónde está

- **GitHub Pages**: https://feli202.github.io/avalancha/ — rama `main` del repo `feli202/avalancha` con **solo la build** (`dist/*` + `.nojekyll`). El código fuente va en `master`.
- **itch.io**: https://exponent-games.itch.io/avalanche (zip `release/itch/avalancha-web.zip`, rutas con `/`, `scripts/zip.py`).
- **galaxy.click**: zip en inglés `release/galaxy/avalancha-galaxy-en.zip` (sus reglas piden zip, no embed).
- Discord: https://discord.gg/8qEt7E6AV. Textos de tiendas y redes: `release/`.

## Aviso de versión nueva (`src/version.svelte.ts`)

Sin service worker. Cada build deja `version.json` (fecha y commit); se consulta al abrir, al volver a la pestaña y cada 10 min. Si cambió: "Hay una versión nueva de Avalancha" → Actualizar (guarda, desregistra service workers, abre `?v=<versión>`). En itch.io no hay `version.json` y no hace nada. `<meta http-equiv="Cache-Control" content="no-cache">`.

## PWA (`public/manifest.webmanifest`)

`display: standalone`, `id`/`start_url`/`scope` = `./`, fondo y tema `#07080f`. Íconos de una pila real (`scripts/iconos.mjs`, con `npm run dev` corriendo): 192/512 `any` y `maskable`, `apple-touch-icon.png` 180. iOS: meta tags, `viewport-fit=cover`, safe areas en `#app`.

Tarjeta "Instalá Avalancha como app" (`Instalar.svelte`): una vez por dispositivo, **solo en celular/tablet** (`esMovil()`), no sale instalada. Chrome/Edge: `beforeinstallprompt` → `prompt()`; iPhone: pasos con íconos y copiar la partida; dentro de itch.io: lleva a GitHub con el pase de partida ([guardado.md](guardado.md)).

## itch.io: detalles técnicos

- itch sirve los gzip con `Content-Encoding: gzip` (por eso `fotos.ts` detecta la firma).
- `scripts/itch-falso.mjs dist 4180` imita itch (subcarpeta, iframe de otro origen, gzip). Config `itch-falso` en `.claude/launch.json`.
- Diseño apaisado chico para el reproductor de 640×360. El juego no tiene botón propio de pantalla completa.

## Comunidad y estadísticas

- `src/comunidad.ts`: Discord, itch.io, sitio. Pop-up de comunidad a los 600 s de juego activo, una vez por dispositivo.
- GoatCounter (sin cookies, respeta Do Not Track, apagable): apagado mientras `GOATCOUNTER` esté vacío. Eventos puros en `estadisticasAnonimas.ts`. Política: `public/privacidad.html`.
