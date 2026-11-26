# Puerta de la beta (fase 1B)

- **Una sola pregunta:** `esBeta(p)` en `src/guardado/guardado.ts` (sirve con una `Partida` o con `juego`). Todo lo de la Capa 2 la usa; sin la marca el juego es el público.
- **Marca:** `Partida.beta = { codigo, desde }` (opcional, sin subir `VERSION`: un guardado sin ella es una partida pública; una marca rota se descarta sin invalidar la partida). Viaja con exportar, importar y el pase.
- **Dónde:** pantalla de la Capa 2 (fin de la Capa 1 y silueta de la barra), debajo de "Próximamente": `src/ui/Beta.svelte`. Botón "Jugar beta" → tarjeta (al `body`: la placa tiene clip-path) con código + Entrar y el pedido por mail (mail, nombre/Discord opcional, casilla de consentimiento, Solicitar). Estados: enviando, enviado, código o mail inválido, límite, error, sin conexión.
- **Sin URL** (`BETA_URL` vacía en `src/comunidad.ts`): el botón dice "La beta todavía no está abierta" y no hace nada.
- **Entrar** (`entrarBeta`, `guardado/beta.ts`): con el código verificado y el aviso aceptado, guarda la partida sin marca en `avalancha.copia.antesDeLaBeta` y la marcada en la principal; recarga. Si la copia no se puede escribir, no marca. Después no vuelve a consultar el servicio (anda sin conexión).
- **Volver** (Ajustes → Partida, solo en la beta): la de antes con la fecha de ahora (sin ausencia por el tiempo en la beta); la beta queda en `avalancha.copia.beta`, que sale en la lista de respaldos.
- **En la beta**, la pantalla de la Capa 2 dice que lo primero del fuego llega en las próximas versiones (las fases 3+ todavía no existen).
- **Servicio:** `apps-script/beta.gs` (Google Apps Script en gamesexponent@gmail.com, hoja "Solicitudes"), pasos en `apps-script/SETUP_BETA.md`. El juego manda POST `text/plain` con JSON (`src/ui/servicioBeta.ts`, sin preflight de CORS). Límites: 1 pedido por mail cada 24 h, 40 pedidos en 24 h entre todos, 30 códigos equivocados por hora. Links de Aprobar/Rechazar firmados con HMAC (`CLAVE_HMAC` en las propiedades del script) que muestran un botón. Código: 8 caracteres de `23456789ABCDEFGHJKMNPQRSTUVWXYZ`.
- **Privacidad:** `public/privacidad.html`, sección "Beta de la Capa 2".
- Tests: `tests/beta.test.ts` (marca, entrar/volver, estados del servicio), `tests/beta_script.test.ts` (el script con hoja, Gmail y caché falsos).
