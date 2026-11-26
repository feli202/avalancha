// Avalancha · servicio de la beta de la Capa 2. Google Apps Script pegado en una hoja de cálculo (Extensiones → Apps Script),
// implementado como aplicación web. Pasos: apps-script/SETUP_BETA.md. Tests con datos falsos: tests/beta_script.test.ts.
//
// Desde el juego (src/ui/servicioBeta.ts): POST con Content-Type text/plain y un JSON {accion, ...}; responde {r: ...}:
//   {accion: 'solicitar', mail, nombre, idioma} → ok | invalido | limite | error
//   {accion: 'verificar', codigo}               → ok | invalido | limite | error
// Los links de Aprobar y Rechazar del mail al dueño (GET) van firmados con HMAC; la decisión se toma con un botón en la página
// (así un antivirus del correo que abre los links no aprueba nada solo).

var DUENO = 'gamesexponent@gmail.com'
var JUEGO = 'https://feli202.github.io/avalancha/'
var HOJA = 'Solicitudes'
var COLUMNAS = ['fecha', 'mail', 'nombre', 'idioma', 'estado', 'codigo', 'id']
var ESPERA_MS = 24 * 3600 * 1000 // un pedido por mail cada 24 h
var MAX_DIARIO = 40 // pedidos en 24 h entre todos (Gmail gratis manda ~100 mails por día; cada pedido aprobado usa 2)
var MAX_FALLOS = 30 // códigos equivocados en una hora entre todos; después, 'limite'
var ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ' // sin 0 O 1 I L; el mismo que CODIGO_BETA en src/guardado/guardado.ts
var CODIGO = /^[2-9A-HJKMNP-Z]{8}$/
var MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents)
    if (d.accion === 'solicitar') return json_({ r: solicitar(d.mail, d.nombre, d.idioma) })
    if (d.accion === 'verificar') return json_({ r: verificar(d.codigo) })
  } catch (err) { console.error(err) }
  return json_({ r: 'error' })
}

function solicitar(mail, nombre, idioma) {
  mail = String(mail || '').trim().toLowerCase()
  if (mail.length > 254 || !MAIL.test(mail)) return 'invalido'
  nombre = String(nombre || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 64)
  idioma = idioma === 'en' ? 'en' : 'es'
  var lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    var hoja = hoja_(), filas = hoja.getDataRange().getValues().slice(1), ahora = Date.now(), recientes = 0
    for (var i = 0; i < filas.length; i++) {
      if (ahora - new Date(filas[i][0]).getTime() >= ESPERA_MS) continue
      recientes++
      if (String(filas[i][1]).toLowerCase() === mail) return 'limite'
    }
    if (recientes >= MAX_DIARIO || MailApp.getRemainingDailyQuota() < 2) return 'limite'
    var id = Utilities.getUuid(), url = ScriptApp.getService().getUrl()
    var link = function (accion) { return url + '?accion=' + accion + '&id=' + id + '&firma=' + firmar_(accion + ':' + id) }
    // Primero el mail: si falla (cuota), no queda anotado y el jugador puede volver a probar.
    MailApp.sendEmail(DUENO, 'Avalancha beta: pedido de ' + mail, [
      'Mail: ' + mail, 'Nombre / Discord: ' + (nombre || '(no puso)'), 'Idioma: ' + idioma, '',
      'Aprobar: ' + link('aprobar'), '', 'Rechazar: ' + link('rechazar'),
    ].join('\n'))
    hoja.appendRow([new Date(ahora), texto_(mail), texto_(nombre), idioma, 'pendiente', '', id])
    return 'ok'
  } finally { lock.releaseLock() }
}

function verificar(codigo) {
  codigo = String(codigo || '').toUpperCase()
  var cache = CacheService.getScriptCache(), fallos = Number(cache.get('fallos') || 0)
  if (fallos >= MAX_FALLOS) return 'limite'
  if (CODIGO.test(codigo)) {
    var filas = hoja_().getDataRange().getValues()
    for (var i = 1; i < filas.length; i++) if (filas[i][5] === codigo && filas[i][4] === 'aprobado') return 'ok'
  }
  cache.put('fallos', String(fallos + 1), 3600)
  return 'invalido'
}

/** Los links del mail al dueño: verifica la firma y muestra un botón; nada cambia hasta tocarlo. */
function doGet(e) {
  var p = (e && e.parameter) || {}, accion = String(p.accion || ''), id = String(p.id || ''), firma = String(p.firma || '')
  if ((accion !== 'aprobar' && accion !== 'rechazar') || !firmaOk_(accion + ':' + id, firma)) return pagina_('Link inválido.', '')
  var boton = '<button id="b" onclick="this.disabled=true;google.script.run.withSuccessHandler(function(t){document.getElementById(\'m\').textContent=t;document.getElementById(\'b\').remove()})'
    + ".decidir('" + accion + "','" + id + "','" + firma + "')\">" // seguros: la firma ya validó los tres
    + (accion === 'aprobar' ? 'Aprobar y mandar el código' : 'Rechazar') + '</button>'
  return pagina_('', boton)
}

/** Lo llama el botón de la página (google.script.run). Devuelve el texto a mostrar. */
function decidir(accion, id, firma) {
  if ((accion !== 'aprobar' && accion !== 'rechazar') || !firmaOk_(accion + ':' + id, String(firma))) return 'Link inválido.'
  var lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    var hoja = hoja_(), filas = hoja.getDataRange().getValues()
    for (var i = 1; i < filas.length; i++) {
      if (filas[i][6] !== id) continue
      var estado = filas[i][4], mail = String(filas[i][1])
      if (estado !== 'pendiente') return 'Este pedido ya estaba ' + estado + (estado === 'aprobado' ? ' (código ' + filas[i][5] + ').' : '.')
      if (accion === 'rechazar') { hoja.getRange(i + 1, 5).setValue('rechazado'); return 'Pedido rechazado.' }
      var codigo = codigoNuevo_(filas)
      mandarCodigo_(mail, codigo, filas[i][3]) // si falla, el pedido sigue pendiente
      hoja.getRange(i + 1, 5, 1, 2).setValues([['aprobado', codigo]])
      return 'Código ' + codigo + ' enviado a ' + mail + '.'
    }
    return 'No encontré ese pedido (¿se borró la fila?).'
  } finally { lock.releaseLock() }
}

function mandarCodigo_(mail, codigo, idioma) {
  if (idioma === 'en') {
    MailApp.sendEmail(mail, 'Your Avalancha beta code', [
      'Hi!', '', 'Your code for the Avalancha Layer 2 beta is:', '', '    ' + codigo, '',
      'How to use it: open Avalancha (' + JUEGO + '), go to the Layer 2 screen (at the end of Layer 1, or tap its silhouette in the side bar),',
      'tap "Play beta", type the code and tap "Enter". Your save is backed up before you go in.', '',
      'Your email is used only to send you this code. Reply to this email if you want it deleted.', '', '— Avalancha',
    ].join('\n'))
  } else {
    MailApp.sendEmail(mail, 'Tu código para la beta de Avalancha', [
      '¡Hola!', '', 'Tu código para la beta de la Capa 2 de Avalancha es:', '', '    ' + codigo, '',
      'Cómo usarlo: abrí Avalancha (' + JUEGO + '), andá a la pantalla de la Capa 2 (al final de la Capa 1, o tocando su silueta en la barra lateral),',
      'tocá «Jugar beta», escribí el código y tocá «Entrar». Antes de entrar se guarda un respaldo de tu partida.', '',
      'Tu mail se usa solo para mandarte este código. Si querés que lo borremos, respondé este mail.', '', '— Avalancha',
    ].join('\n'))
  }
}

/** 8 caracteres del alfabeto, de bytes de SHA-256 de un UUID (bytes ≥ 248 se descartan: sin sesgo); que no se repita. */
function codigoNuevo_(filas) {
  var usados = {}
  for (var i = 0; i < filas.length; i++) usados[filas[i][5]] = true
  for (;;) {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid()), c = ''
    for (var j = 0; j < bytes.length && c.length < 8; j++) {
      var b = (bytes[j] + 256) % 256 // Apps Script da bytes con signo
      if (b < 248) c += ALFABETO.charAt(b % 31)
    }
    if (c.length === 8 && !usados[c]) return c
  }
}

function firmar_(texto) {
  var clave = PropertiesService.getScriptProperties().getProperty('CLAVE_HMAC')
  if (!clave || clave.length < 16) throw new Error('Falta CLAVE_HMAC (16 caracteres o más) en las propiedades del script')
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(texto, clave)).replace(/=+$/, '')
}

/** Comparación en tiempo constante. */
function firmaOk_(texto, firma) {
  var bien = firmar_(texto), dif = bien.length ^ firma.length
  for (var i = 0; i < bien.length; i++) dif |= bien.charCodeAt(i) ^ firma.charCodeAt(i % (firma.length || 1))
  return dif === 0
}

function hoja_() {
  var libro = SpreadsheetApp.getActiveSpreadsheet(), h = libro.getSheetByName(HOJA)
  if (!h) { h = libro.insertSheet(HOJA); h.appendRow(COLUMNAS) }
  return h
}

/** Que la hoja no tome como fórmula algo que escribió un jugador (=, +, -, @). */
function texto_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s }

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON) }

function pagina_(mensaje, extra) {
  var esc = String(mensaje).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return HtmlService.createHtmlOutput('<div style="font:18px system-ui;padding:2rem"><h1 style="font-size:1.4rem">Avalancha · beta</h1><p id="m">'
    + esc + '</p>' + extra + '</div>').setTitle('Avalancha · beta')
}
