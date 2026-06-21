import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Идентификатор сборки: уникален на каждый `vite build` (или из VITE_BUILD_ID в CI).
// Вшивается в приложение (__BUILD_ID__) и кладётся в /version.json — клиент сравнивает их
// и предлагает обновить страницу, когда вышла новая версия фронта.
const BUILD_ID = process.env.VITE_BUILD_ID || Date.now().toString(36)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'emit-version-json',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) })
      },
    },
  ],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
})
