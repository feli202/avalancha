---
name: zip-itch
description: Armar los zip de Avalancha para itch.io y galaxy.click y probarlos como en itch. Usar cuando el usuario pide el zip, subir a itch/galaxy o rehacer los archivos de release/.
---

# Zip para itch.io y galaxy.click

Los zip no van a git (`release/**/*.zip`). Siempre con `scripts/zip.py`: escribe rutas con `/` y verifica `index.html` en la raíz. **Nunca `Compress-Archive`** (guarda `\` y el juego queda en negro en itch).

1. itch.io (idioma según el ajuste del jugador):
   ```bash
   npm run build
   python scripts/zip.py release/itch/avalancha-web.zip
   ```
   (`npm run zip` hace build + zip a `marketing/itch/avalancha-web.zip`.)
2. galaxy.click (entra en inglés), y después volver a la build normal para no dejar `dist/` en inglés:
   ```bash
   VITE_IDIOMA=en npx vite build && python scripts/zip.py release/galaxy/avalancha-galaxy-en.zip && npx vite build
   ```
3. Probar como en itch (subcarpeta, iframe de otro origen, gzip): `preview_start` con la config `itch-falso` de `.claude/launch.json` (o `node scripts/itch-falso.mjs dist 4180`) y abrir `http://localhost:4180/`. Consola sin errores ni 404, Logros y Ajustes → Aspecto con vistas previas, guardado al recargar.
4. Subir a mano siguiendo `release/CHECKLIST.md` (el usuario sube; Claude no publica en sitios externos).

Capturas y GIF de itch: `scripts/capturas-itch.mjs` + `scripts/itch_final.py`. Tráileres: copiar `marketing/trailer/final/*.mp4` a `release/itch/` y `release/redes/`.
