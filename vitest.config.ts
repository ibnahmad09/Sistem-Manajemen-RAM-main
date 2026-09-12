import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/js'),
        },
        conditions: ['browser', 'module', 'node', 'import', 'default'],
    },
    ssr: {
        resolve: {
            // Vite >= 6 resolves test (SSR) imports with ssr.resolve.conditions,
            // not resolve.conditions. The receipt-printer packages only export
            // under the "browser" condition, so it must be listed here too.
            conditions: ['browser', 'module', 'node', 'import', 'default'],
        },
    },
    test: {
        include: ['tests/JS/**/*.test.ts'],
    },
});
