import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import envCompatible from 'vite-plugin-env-compatible';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [
        react(),
        svgr(),
        envCompatible({ prefix: 'REACT_APP_' })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        host: true, // Listen on all addresses
        strictPort: true,
        hmr: {
            clientPort: 3000, // Force client to connect to port 3000
        },
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            '/ws': {
                target: 'http://localhost:8000',
                ws: true,
            },
        },
    },
    build: {
        outDir: 'build',
    },
});
