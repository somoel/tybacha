import { AppCard } from '@/src/components/ui/AppCard';
import type { MedicalNoteType } from '@/src/types/medicalHistory.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

const NOTE_TYPE_CONFIG: Record<MedicalNoteType, { label: string; color: string; bg: string; icon: string }> = {
  antecedente: { label: 'Antecedente', color: '#283593', bg: '#e8eaf6', icon: 'history' },
  alergia: { label: 'Alergia', color: '#c62828', bg: '#ffebee', icon: 'alert-octagon' },
  limitacion: { label: 'Limitación', color: '#f57c00', bg: '#fff3e0', icon: 'accessibility' },
  observacion: { label: 'Observación', color: '#374151', bg: '#f0f3f6', icon: 'note-text' },
  otro: { label: 'Otro', color: '#6b7280', bg: '#f0f3f6', icon: 'dots-horizontal' },
};

interface MedicalNoteCardProps {
  tipoNota: MedicalNoteType;
  contenido: string;
  creadoEn: string;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function MedicalNoteCard({ tipoNota, contenido, creadoEn, onPress, onLongPress }: MedicalNoteCardProps) {
  const config = NOTE_TYPE_CONFIG[tipoNota];

  return (
    <AppCard onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
          <MaterialCommunityIcons name={config.icon as any} size={14} color={config.color} />
          <Text style={[styles.typeLabel, { color: config.color }]}>{config.label}</Text>
        </View>
        <Text style={styles.date}>
          {format(new Date(creadoEn), 'dd MMM yyyy', { locale: es })}
        </Text>
      </View>
      <Text style={styles.content}>{contenido}</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  typeLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
  },
  date: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#9ca3af',
  },
  content: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
});
