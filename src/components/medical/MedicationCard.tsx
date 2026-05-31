import { StatusChip } from '@/src/components/medical/StatusChip';
import { AppCard } from '@/src/components/ui/AppCard';
import type { Medication } from '@/src/types/medicalHistory.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface MedicationCardProps {
  medication: Medication;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function MedicationCard({ medication, onPress, onLongPress }: MedicationCardProps) {
  const theme = useTheme();
  const details = [medication.dosis, medication.frecuencia].filter(Boolean).join(' · ');

  return (
    <AppCard onPress={onPress}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="pill" size={20} color={theme.colors.primary} />
        <View style={styles.headerInfo}>
          <Text style={styles.name} numberOfLines={1}>{medication.nombre}</Text>
          <StatusChip status={medication.estado} />
        </View>
      </View>
      {details && <Text style={styles.detail}>{details}</Text>}
      {medication.viaAdministracion && (
        <Text style={styles.route}>Vía: {medication.viaAdministracion}</Text>
      )}
      {medication.observaciones && (
        <Text style={styles.notes} numberOfLines={2}>{medication.observaciones}</Text>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  headerInfo: { flex: 1, gap: 6 },
  name: { fontFamily: 'Montserrat_600SemiBold', fontSize: 15, color: '#1f2937' },
  detail: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: '#374151', marginTop: 8 },
  route: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280', marginTop: 2 },
  notes: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280', marginTop: 4, fontStyle: 'italic' },
});
