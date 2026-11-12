import { mount } from 'svelte'
import App from './ui/App.svelte'
import { arrancar } from './ui/juego.svelte'

arrancar() // primero: carga la partida
mount(App, { target: document.getElementById('app')! })
