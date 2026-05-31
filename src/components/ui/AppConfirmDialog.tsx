import React from 'react';
import { useTheme, Dialog, Portal, Text, Button as PaperButton } from 'react-native-paper';

interface AppConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AppConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  destructive = true,
  loading = false,
  onConfirm,
  onCancel,
}: AppConfirmDialogProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <PaperButton disabled={loading} onPress={onCancel}>
            {cancelLabel}
          </PaperButton>
          <PaperButton
            loading={loading}
            onPress={onConfirm}
            textColor={destructive ? theme.colors.error : undefined}
          >
            {confirmLabel}
          </PaperButton>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
