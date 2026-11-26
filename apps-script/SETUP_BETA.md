# Poner en marcha el servicio de la beta

Todo en la cuenta **gamesexponent@gmail.com**. Sin servidor propio: una hoja de cálculo con un script de Google.

1. **Crear la hoja.** Entrá a https://sheets.google.com con gamesexponent@gmail.com → Hoja en blanco. Ponele de nombre "Avalancha beta". (La pestaña "Solicitudes" la crea el script solo, con sus columnas.)
2. **Pegar el script.** En la hoja: Extensiones → Apps Script. Borrá lo que hay en `Código.gs` y pegá todo `apps-script/beta.gs`. Guardá (ícono del disquete). Arriba a la izquierda, cambiá "Proyecto sin título" por "Avalancha beta".
3. **Poner la clave.** En Apps Script: ⚙ Configuración del proyecto (rueda a la izquierda) → abajo, Propiedades del script → Agregar propiedad:
   - Propiedad: `CLAVE_HMAC`
   - Valor: una frase larga e inventada (32 caracteres o más, por ejemplo cinco palabras al azar con números). No la compartas: firma los links de Aprobar y Rechazar. → Guardar.
4. **Implementar como aplicación web.** Botón azul Implementar → Nueva implementación → ⚙ al lado de "Tipo" → Aplicación web.
   - Descripción: `beta 1`
   - Ejecutar como: **Yo (gamesexponent@gmail.com)**
   - Quién tiene acceso: **Cualquier usuario**
   - → Implementar.
5. **Autorizar.** Google pide permisos (hoja, mandar mails, servicio externo). Elegí la cuenta → aparece "Google no verificó esta app" → Configuración avanzada → Ir a Avalancha beta (no seguro) → Permitir. Es normal: la app es tuya.
6. **Copiar la URL.** Al terminar muestra "URL de la aplicación web", que termina en `/exec`. Copiala.
7. **Pegarla en el juego.** En `src/comunidad.ts`, `BETA_URL = 'https://script.google.com/macros/s/…/exec'`. Decímelo y lo pruebo y lo subo yo.
8. **Probar.**
   - En el juego (local o publicado), pantalla de la Capa 2 → Jugar beta → pedí un código con un mail tuyo.
   - Te llega a gamesexponent@gmail.com "Avalancha beta: pedido de …" con dos links. Tocá **Aprobar** → se abre una página con un botón "Aprobar y mandar el código" → tocalo → "Código XXXXXXXX enviado a …".
   - Al mail que pusiste llega el código. Escribilo en el juego → Entrar → aviso → Entrar a la beta.
   - En la hoja, la fila pasa a `aprobado` con el código.

## Cosas para saber

- **Límite de Gmail gratis: unos 100 mails por día** (destinatarios). Cada pedido usa 1 (el aviso a vos) y cada aprobación otro (el código al jugador). Por eso el script corta en **40 pedidos cada 24 h** entre todos (`MAX_DIARIO`) y si a Gmail le quedan menos de 2 mails ese día responde "probá mañana". Si un día aprobás muchos, alguno puede fallar: el pedido queda `pendiente` y lo aprobás al otro día con el mismo link.
- Un pedido por mail cada 24 h. Códigos equivocados: 30 por hora entre todos; después responde "demasiados intentos" una hora.
- **Cambiar el script después:** pegá la versión nueva → Implementar → Gestionar implementaciones → ✏ en la que hay → Versión: **Nueva versión** → Implementar. Así la URL sigue siendo la misma (con "Nueva implementación" cambia y hay que volver al paso 7).
- **Quitarle la beta a alguien:** en la hoja, cambiá su `estado` a `revocado`. Ya no puede entrar con ese código en un dispositivo nuevo (quien ya entró sigue: la marca queda en su partida).
- **Borrar el mail de alguien (si lo pide):** borrá su fila entera en la hoja (clic derecho en el número de fila → Borrar fila) y el mail en Gmail (enviados y recibidos).
- Los links de Aprobar y Rechazar no hacen nada solos: muestran un botón. Así un antivirus del correo que abra los links no aprueba nada.
