import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

const STATUS_COLORS: Record<string, { bg: string; color: string; icon: string }> = {
  activa: { bg: '#fef3c7', color: '#92400e', icon: 'alert-circle' },
  activo: { bg: '#e8f5e9', color: '#2e7d32', icon: 'check-circle' },
  resuelta: { bg: '#e8f5e9', color: '#2e7d32', icon: 'check-circle' },
  suspendido: { bg: '#fff3e0', color: '#f57c00', icon: 'pause-circle' },
  finalizado: { bg: '#f0f3f6', color: '#6b7280', icon: 'stop-circle' },
  cronica: { bg: '#e8eaf6', color: '#283593', icon: 'refresh' },
  desconocida: { bg: '#f0f3f6', color: '#9ca3af', icon: 'help-circle' },
  desconocido: { bg: '#f0f3f6', color: '#9ca3af', icon: 'help-circle' },
};

interface StatusChipProps {
  status: string;
}

export function StatusChip({ status }: StatusChipProps) {
  const config = STATUS_COLORS[status] ?? { bg: '#f0f3f6', color: '#6b7280', icon: 'minus-circle' };
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View style={[styles.chip, { backgroundColor: config.bg }]}>
      <MaterialCommunityIcons name={config.icon as any} size={12} color={config.color} />
      <Text style={[styles.label, { color: config.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
  },
});
