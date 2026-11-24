# Publicación de Avalancha 1.0 — checklist

Todo lo que se sube está en esta carpeta. Los `.zip` y `.mp4` no van a git (pesan demasiado): si faltan, se rehacen con los comandos del final.

## 0. Antes de empezar

- [ ] Leer las descripciones y cambiar lo que quieras: itch `itch/descripcion_en.md` / `descripcion_es.md` (la primera línea es la descripción corta), galaxy `galaxy/descripcion_galaxy.md`, Reddit `reddit/post_reddit.md`, perfiles de TikTok/Instagram, YouTube y Discord en `redes/descripciones_perfiles.md`.
- [ ] Abrir https://feli202.github.io/avalancha/ → Ajustes → Créditos: dice `1.0.0 · …`, la línea de IA y los botones de Discord e itch.io.

## 1. itch.io (primero: es el link de todo lo demás)

- [ ] **Perfil de Exponent Games** (Edit profile → avatar): `exponent_avatar.png` (1080×1080, 248 KB, la misma foto de siempre comprimida sin pérdida). Sirve también para Discord, galaxy.click, Reddit, TikTok e Instagram.

Página: https://exponent-games.itch.io/avalanche → Edit game.

- [ ] **Uploads**: borrar el zip viejo, subir `itch/avalancha-web.zip`, marcar *This file will be played in the browser*.
- [ ] **Embed options**: tamaño 1280×720 (o *Click to launch in fullscreen* para celular), tildar *Mobile friendly* (orientación: Default), *Fullscreen button*. No tildar *SharedArrayBuffer*.
- [ ] **Cover image**: `itch/portada-630x500.png` (itch pide 630×500; si deja, la de 1260×1000).
- [ ] **Screenshots**: `itch/en-1…en-6-*.png` (página en inglés) y `itch/celular-1…3-*.png`. Las `es-*` son para la página en español o para devlogs.
- [ ] **Trailer**: itch solo acepta un link de YouTube/Vimeo → subir `itch/trailer_vertical_en.mp4` a YouTube (como Short, título y descripción en `redes/descripciones_perfiles.md`) y pegar el link.
- [ ] **Description**: `itch/descripcion_en.md` (y debajo, o en la página en español, `descripcion_es.md`). El GIF `itch/avalancha-600.gif` va arriba de la descripción.
- [ ] **Genre / Tags / AI disclosure / Accessibility**: `itch/etiquetas.txt`.
- [ ] **Pricing**: *No payments* o *Donate* (pago opcional, lo decide itch, no el juego).
- [ ] **Visibility**: Public → Save.
- [ ] **Devlog**: nuevo post "Avalancha 1.0" con `itch/changelog_1.0.md` (inglés arriba, español abajo).
- [ ] Probar la página publicada en la PC y en el celular (tocar Jugar, ver Créditos).

## 2. galaxy.click

galaxy.click no publica los tamaños de la miniatura: en el formulario de subida elegí la que pida (hay 1280×720, 512×512, 256×256 y 630×500 en `galaxy/`).

- [ ] Subir `galaxy/avalancha-galaxy-en.zip` (sale en inglés de entrada; el jugador puede cambiar a español en Ajustes). Sus reglas prohíben subir un juego embebido de otro sitio: subí el zip, no un link a GitHub ni a itch.
- [ ] Descripción: `galaxy/descripcion_galaxy.md`. Etiquetas: las de `itch/etiquetas.txt` que el sitio ofrezca (incremental, idle, prestige…).
- [ ] Miniatura: `galaxy/miniatura-*.png`.
- [ ] No hay compras con dinero real ni publicidad en el juego (la "tienda" es la de Energía), así que no hay nada que desactivar.

## 3. Reddit (después de que itch esté público)

- [ ] r/incremental_games: post con `reddit/avalancha.gif` (8,6 MB) y el texto de `reddit/post_reddit.md`. Leer las reglas del sub antes (suelen pedir post de texto con link y reservar la autopromoción a ciertos días o al hilo semanal).
- [ ] Responder comentarios las primeras horas; el feedback de balance va a `PENDIENTES.md`.

## 4. TikTok e Instagram

- [ ] TikTok: `redes/trailer_vertical_es.mp4` (o `_en`) con un texto de `redes/textos_redes.md`.
- [ ] Bio de TikTok e Instagram: `redes/descripciones_perfiles.md`.
- [ ] Instagram Reels: el mismo video, portada `redes/miniatura_vertical.png`, el link en la bio.
- [ ] Repetir en días distintos con los otros textos (hay 5 por idioma).

## 5. Discord

- [ ] Anunciar en https://discord.gg/8qEt7E6AV con el texto de `redes/descripciones_perfiles.md` (pegar el link de galaxy cuando esté).

## Rehacer los archivos que no van a git

```bash
npm run zip
python scripts/zip.py release/itch/avalancha-web.zip
```

```bash
VITE_IDIOMA=en npx vite build && python scripts/zip.py release/galaxy/avalancha-galaxy-en.zip && npx vite build
```

Tráileres: copiar `marketing/trailer/final/*.mp4` a `release/itch/` y a `release/redes/`.
