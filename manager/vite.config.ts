import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // CRITICAL: This enables relative paths for assets.
  // Required for GitHub Pages (https://user.github.io/repo-name/)
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});