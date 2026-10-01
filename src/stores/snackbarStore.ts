import { create } from 'zustand';

export type SnackbarType = 'success' | 'error' | 'info';

interface SnackbarState {
    visible: boolean;
    message: string;
    type: SnackbarType;
    /** Cuánto tiempo se muestra el snackbar (ms). */
    duration: number;
    /**
     * Contador incrementado en cada show(). El GlobalSnackbar usa esta clave
     * para remontar el <Snackbar> y reiniciar su timer de auto-ocultado:
     * Paper solo reacciona al cambio visible false→true, así que sin remontar
     * un mensaje nuevo que llega mientras otro está visible se perdería.
     */
    seq: number;

    show: (message: string, type?: SnackbarType, duration?: number) => void;
    hide: () => void;
}

const DEFAULT_DURATION = 3000;

/**
 * Snackbar store – única fuente de verdad de los mensajes flotantes.
 * Al vivir fuera de cada pantalla, el mensaje sobrevive a la navegación
 * y no hace falta esperar con setTimeout antes de redirigir.
 */
export const useSnackbarStore = create<SnackbarState>()((set) => ({
    visible: false,
    message: '',
    type: 'info',
    duration: DEFAULT_DURATION,
    seq: 0,

    show: (message, type = 'info', duration = DEFAULT_DURATION) =>
        set((state) => ({
            visible: true,
            message,
            type,
            duration,
            seq: state.seq + 1,
        })),

    hide: () => set({ visible: false }),
}));

/**
 * Muestra el snackbar global. Se puede llamar desde cualquier sitio
 * (handlers, callbacks, servicios) sin necesidad de hooks.
 */
export function showSnackbar(message: string, type: SnackbarType = 'info', duration = DEFAULT_DURATION): void {
    useSnackbarStore.getState().show(message, type, duration);
}

/** Oculta el snackbar global (también lo hace Paper al agotar la duración). */
export function hideSnackbar(): void {
    useSnackbarStore.getState().hide();
}
