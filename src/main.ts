import { mount } from 'svelte'
import App from './ui/App.svelte'
import { arrancar } from './ui/juego.svelte'

mount(App, { target: document.getElementById('app')! })
arrancar()
