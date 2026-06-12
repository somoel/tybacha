import { StatusChip } from '@/src/components/medical/StatusChip';
import { AppCard } from '@/src/components/ui/AppCard';
import type { Medication } from '@/src/types/medicalHistory.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Menu, Text, useTheme } from 'react-native-paper';

interface MedicationCardProps {
  medication: Medication;
  canEdit?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function MedicationCard({ medication, canEdit, onPress, onEdit, onDelete }: MedicationCardProps) {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const details = [medication.dosis, medication.frecuencia].filter(Boolean).join(' · ');

  return (
    <AppCard onPress={onPress}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="pill" size={20} color={theme.colors.primary} />
        <View style={styles.headerInfo}>
          <Text style={styles.name} numberOfLines={1}>{medication.nombre}</Text>
          <StatusChip status={medication.estado} />
        </View>
        {canEdit && (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TouchableOpacity onPress={() => setMenuVisible(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="dots-vertical" size={20} color="#6b7280" />
              </TouchableOpacity>
            }
          >
            <Menu.Item
              leadingIcon="pencil"
              onPress={() => { setMenuVisible(false); onEdit?.(); }}
              title="Editar"
            />
            <Menu.Item
              leadingIcon="delete"
              onPress={() => { setMenuVisible(false); onDelete?.(); }}
              title="Eliminar"
            />
          </Menu>
        )}
      </View>
      {details && <Text style={styles.detail}>{details}</Text>}
      {medication.viaAdministracion && (
        <Text style={styles.route}>Vía: {medication.viaAdministracion}</Text>
      )}
      {medication.observaciones && (
        <Text style={styles.notes} numberOfLines={2}>{medication.observaciones}</Text>
      )}
      {medication.registradoPorNombre && (
        <View style={styles.registeredBy}>
          <MaterialCommunityIcons name="account-outline" size={12} color="#9ca3af" />
          <Text style={styles.registeredByText}>{medication.registradoPorNombre}</Text>
        </View>
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
  registeredBy: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  registeredByText: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#9ca3af' },
});
