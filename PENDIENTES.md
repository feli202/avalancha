# Pendientes para la auditoría

Puntos encontrados al probar. Resueltos después de la auditoría (ver `AUDITORIA.md`).

1. ✅ **La pila se descentró** (I4). En escritorio está siempre en el centro exacto de la ventana, con cualquier panel; en ventanas angostas se achica en vez de correrse. **Falta decidir móvil**: SPEC 6.4 dice "pila arriba (55 % de la pantalla)" y este punto pide el centro exacto. Quedó como dice la spec (centrada en horizontal, en la zona de arriba en vertical) hasta que se decida la spec.

2. ✅ **Inicio poco cinematográfico** (I5). El título sale siempre ("Continuar" con partida), sobre la pila del juego quieta y lejos; la economía y el fuera de línea esperan. Al tocar Jugar la cámara se acerca, cae el primer grano y la interfaz aparece en orden. "Mientras no estabas" se calcula y se muestra recién después de entrar.

3. ✅ **Menús con patrones genéricos** (M2). Una sola familia de controles, la de la tienda: pestañas de texto con línea, sin tarjetas, píldoras, vidrio ni teclas dibujadas.
