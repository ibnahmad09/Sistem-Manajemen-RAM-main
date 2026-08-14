import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/js'),
        },
        conditions: ['browser', 'module', 'node', 'import', 'default'],
    },
    test: {
        include: ['tests/JS/**/*.test.ts'],
    },
});
