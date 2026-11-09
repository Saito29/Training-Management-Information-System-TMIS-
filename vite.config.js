import { cpSync } from 'node:fs';
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        {
            name: 'tmis-static-assets',
            buildStart() {
                cpSync('resources/css', 'public/src/css', { recursive: true });
                cpSync('resources/js', 'public/src/js', { recursive: true });
                cpSync('assets', 'public/assets', { recursive: true });
            },
            configureServer(server) {
                server.watcher.add(['resources/css', 'resources/js', 'assets']);
                server.watcher.on('change', (file) => {
                    if (/[/\\](resources[/\\](css|js)|assets)[/\\]/.test(file)) {
                        cpSync('resources/css', 'public/src/css', { recursive: true });
                        cpSync('resources/js', 'public/src/js', { recursive: true });
                        cpSync('assets', 'public/assets', { recursive: true });
                    }
                });
            },
        },
        laravel({
            input: ['resources/js/authentication/page.js'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        tailwindcss(),
    ],
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});

