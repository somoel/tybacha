import React from 'react';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { useSnackbarStore } from '@/src/stores/snackbarStore';

interface GlobalSnackbarProps {
    /**
     * Padding inferior del snackbar. El layout que lo monta lo calcula para
     * que no quede tapado por la tab bar (64) cuando esta es visible.
     */
    bottomOffset: number;
}

/**
 * Snackbar global: se monta en los layouts de grupo, no en cada pantalla.
 * Como no se desmonta al navegar, el mensaje de confirmación sobrevive al
 * cambio de pantalla y no hace falta esperar antes de redirigir.
 */
export function GlobalSnackbar({ bottomOffset }: GlobalSnackbarProps) {
    const visible = useSnackbarStore((s) => s.visible);
    const message = useSnackbarStore((s) => s.message);
    const type = useSnackbarStore((s) => s.type);
    const duration = useSnackbarStore((s) => s.duration);
    const seq = useSnackbarStore((s) => s.seq);
    const hide = useSnackbarStore((s) => s.hide);

    return (
        <AppSnackbar
            key={seq}
            visible={visible}
            message={message}
            type={type}
            duration={duration}
            bottomOffset={bottomOffset}
            onDismiss={hide}
        />
    );
}
