import { defineConfig } from 'vite';
// host: true lets phones on the same Wi-Fi open the dev server at http://<this-pc-ip>:5178
export default defineConfig({ base: './', build: { target: 'es2020' }, server: { host: true } });
