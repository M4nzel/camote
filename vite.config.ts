import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // El sitio se publica en https://m4nzel.github.io/camote/, así que todas las
  // rutas cuelgan de /camote/. Si algún día se despliega en la raíz de un
  // dominio (Vercel, Netlify), hay que volver a poner base: '/'.
  base: '/camote/',
  plugins: [react()],
})
