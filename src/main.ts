import { mount } from 'svelte'
// SPEC 8 (M13): la fuente viaja con el juego; sin conexión no cambia ni el ancho de las cifras.
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-600.css'
import '@fontsource/space-grotesk/latin-700.css'
import App from './ui/App.svelte'
import { arrancar } from './ui/juego.svelte'
import { txt } from './strings'

document.title = txt.titulo

import { vigilarVersion } from './version.svelte'
import { escucharInstalacion } from './instalar.svelte'

escucharInstalacion() // antes que nada: beforeinstallprompt puede llegar enseguida
arrancar() // primero: carga la partida
if (import.meta.env.PROD) vigilarVersion()
mount(App, { target: document.getElementById('app')! })
