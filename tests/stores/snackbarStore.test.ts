import { beforeEach, describe, expect, it } from 'vitest';
import { hideSnackbar, showSnackbar, useSnackbarStore } from '@/src/stores/snackbarStore';

const store = () => useSnackbarStore.getState();

describe('snackbarStore', () => {
    beforeEach(() => {
        store().hide();
    });

    it('arranca oculto', () => {
        expect(store().visible).toBe(false);
        expect(store().message).toBe('');
        expect(store().type).toBe('info');
        expect(store().duration).toBe(3000);
    });

    it('show muestra el mensaje con tipo y duración por defecto', () => {
        showSnackbar('Guardado');

        expect(store().visible).toBe(true);
        expect(store().message).toBe('Guardado');
        expect(store().type).toBe('info');
        expect(store().duration).toBe(3000);
    });

    it('respeta el tipo y la duración personalizados', () => {
        showSnackbar('Fallo', 'error', 5000);

        expect(store().type).toBe('error');
        expect(store().duration).toBe(5000);
    });

    it('incrementa seq en cada show (fuerza el remontaje)', () => {
        const start = store().seq;
        showSnackbar('uno');
        showSnackbar('dos');
        showSnackbar('tres');

        expect(store().seq).toBe(start + 3);
        expect(store().message).toBe('tres');
    });

    it('hide solo oculta el mensaje sin borrarlo', () => {
        showSnackbar('último mensaje');
        hideSnackbar();

        expect(store().visible).toBe(false);
        expect(store().message).toBe('último mensaje');
    });

    it('permite volver a mostrar después de ocultar', () => {
        showSnackbar('a');
        hideSnackbar();
        showSnackbar('b');

        expect(store().visible).toBe(true);
        expect(store().message).toBe('b');
    });
});
