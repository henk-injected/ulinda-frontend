import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { initializeApiRouter } from './config/api'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Initialize API module with router for global error handling
initializeApiRouter(router)

app.mount('#app')
