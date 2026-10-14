import { describe, expect, it } from 'vitest';
import { generateUUID } from '@/src/lib/sqlite';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateUUID', () => {
    it('genera un UUID v4 valido', () => {
        for (let i = 0; i < 50; i++) {
            expect(generateUUID()).toMatch(UUID_V4);
        }
    });

    it('genera identificadores unicos', () => {
        const ids = new Set(Array.from({ length: 500 }, () => generateUUID()));
        expect(ids.size).toBe(500);
    });
});
