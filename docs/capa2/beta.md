# Puerta de la beta (fase 1B)

- **Una sola pregunta:** `esBeta(p)` en `src/guardado/guardado.ts` (sirve con una `Partida` o con `juego`). Todo lo de la Capa 2 la usa; sin la marca el juego es el público.
- **Marca:** `Partida.beta = { codigo, desde }` (opcional, sin subir `VERSION`: un guardado sin ella es una partida pública; una marca rota se descarta sin invalidar la partida). Viaja con exportar, importar y el pase.
- **Dónde:** pantalla de la Capa 2 (fin de la Capa 1 y silueta de la barra), debajo de "Próximamente": `src/ui/Beta.svelte`. Botón "Jugar beta" → tarjeta (al `body`: la placa tiene clip-path) con código + Entrar y "¿No tenés código?": pedir por mail (`mailto:` a `MAIL` de `src/comunidad.ts`, con asunto y texto armados) o en Discord.
- **Códigos, sin servidor:** `python scripts/codigos_beta.py [N]` agrega N códigos a `privado/codigos_beta.txt` (fuera de git: la lista para repartir) y reescribe `src/guardado/codigosBeta.ts` con el SHA-256 (sal `avalancha-beta:`) de todos. El juego compara el hash (`codigoValido`, `guardado/beta.ts`), anda sin conexión. 8 caracteres de `23456789ABCDEFGHJKMNPQRSTUVWXYZ`. Un código sirve en varios dispositivos; para anular uno, borrar su línea de la lista y correr el script con 0. Sin hashes en la lista, el botón dice "La beta todavía no está abierta".
- **Entrar** (`entrarBeta`, `guardado/beta.ts`): con el código verificado y el aviso aceptado, guarda la partida sin marca en `avalancha.copia.antesDeLaBeta` y la marcada en la principal; recarga. Si la copia no se puede escribir, no marca.
- **Volver** (Ajustes → Partida, solo en la beta): la de antes con la fecha de ahora (sin ausencia por el tiempo en la beta); la beta queda en `avalancha.copia.beta`, que sale en la lista de respaldos.
- **En la beta**, la pantalla de la Capa 2 dice que lo primero del fuego llega en las próximas versiones (las fases 3+ todavía no existen).
- **Por qué sin servidor:** la marca vive en la partida local, así que un servidor no protegía más (editar el guardado la pone igual). Primero se hizo con Google Apps Script (en la historia de git, commit 0eb9ee5) y se cambió por esto, más simple.
- **Privacidad:** `public/privacidad.html`, sección "Beta de la Capa 2".
- Tests: `tests/beta.test.ts` (marca, entrar/volver, códigos).
