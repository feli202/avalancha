---
name: publicar-pages
description: Publicar la build de Avalancha en GitHub Pages (feli202.github.io/avalancha, rama main con solo dist/). Usar cuando el usuario pide publicar, subir o actualizar el juego en GitHub / la web.
---

# Publicar en GitHub Pages

La rama `main` del repo `feli202/avalancha` tiene **solo la build** (`dist/*` + `.nojekyll`); Pages publica desde `main` / raíz. El código va en `master`. Nunca commitear código fuente ni docs en `main`.

1. En `master`, todo commiteado y verificado: `npm test` en verde y `npx svelte-check` sin errores.
2. Build de producción (sin `VITE_IDIOMA`): `npm run build`.
3. Worktree de `main` fuera del proyecto:
   ```bash
   git worktree add ../avalancha-pages main
   ```
4. Reemplazar el contenido dejando `.git` y `.nojekyll`:
   ```bash
   cd ../avalancha-pages
   find . -mindepth 1 -maxdepth 1 ! -name .git ! -name .nojekyll -exec rm -rf {} +
   cp -r ../Avalancha/dist/. .
   git add -A
   git commit -m "Publicar: <qué cambió>"
   git push origin main
   cd ../Avalancha
   git worktree remove ../avalancha-pages
   ```
5. Verificar (1–2 min después): `https://feli202.github.io/avalancha/version.json` trae el commit nuevo; abrir el sitio, consola sin errores, Ajustes → Créditos muestra la versión. Los jugadores ven el aviso "Hay una versión nueva".
6. Anotar en `PROGRESO.md` qué build quedó publicada.

Pedir confirmación al usuario antes del `git push` si no lo pidió explícitamente.
