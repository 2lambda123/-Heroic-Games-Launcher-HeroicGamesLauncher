import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import react from '@vitejs/plugin-react'
import svgr from '@honkhonk/vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  build: {
    outDir: 'build'
  },
  resolve: {
    alias: {
      '~@fontsource': path.resolve(__dirname, 'node_modules/@fontsource')
    }
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'src/backend/main.ts'
      }
    }),
    svgr(),
    tsconfigPaths({ loose: true })
  ]
})
