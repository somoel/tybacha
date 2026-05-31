import { StatusChip } from '@/src/components/medical/StatusChip';
import { AppCard } from '@/src/components/ui/AppCard';
import type { Pathology } from '@/src/types/medicalHistory.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Menu, Text, useTheme } from 'react-native-paper';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PathologyCardProps {
  pathology: Pathology;
  canEdit?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PathologyCard({ pathology, canEdit, onPress, onEdit, onDelete }: PathologyCardProps) {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <AppCard onPress={onPress}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="medical-bag" size={20} color={theme.colors.primary} />
        <View style={styles.headerInfo}>
          <Text style={styles.name} numberOfLines={1}>{pathology.nombre}</Text>
          <StatusChip status={pathology.estado} />
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
      {pathology.descripcion && (
        <Text style={styles.desc} numberOfLines={2}>{pathology.descripcion}</Text>
      )}
      {pathology.fechaDiagnostico && (
        <Text style={styles.date}>
          Diagnóstico: {format(new Date(pathology.fechaDiagnostico), 'dd MMM yyyy', { locale: es })}
        </Text>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  headerInfo: { flex: 1, gap: 6 },
  name: { fontFamily: 'Montserrat_600SemiBold', fontSize: 15, color: '#1f2937' },
  desc: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280', marginTop: 8, lineHeight: 18 },
  date: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#9ca3af', marginTop: 6 },
});
