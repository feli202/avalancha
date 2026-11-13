import { mount } from 'svelte'
import App from './ui/App.svelte'
import { arrancar } from './ui/juego.svelte'
import { txt } from './strings'

document.title = txt.titulo

arrancar() // primero: carga la partida
mount(App, { target: document.getElementById('app')! })
