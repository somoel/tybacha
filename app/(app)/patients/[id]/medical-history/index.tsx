import { MedicalNoteCard } from '@/src/components/medical/MedicalNoteCard';
import { MedicationCard } from '@/src/components/medical/MedicationCard';
import { PathologyCard } from '@/src/components/medical/PathologyCard';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { MedicalHistorySkeleton } from '@/src/components/ui/PatientDetailSkeletons';
import { usePermissions } from '@/src/hooks/usePermissions';
import { useMedicalHistoryStore } from '@/src/stores/medicalHistoryStore';
import { AppConfirmDialog } from '@/src/components/ui/AppConfirmDialog';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text, useTheme } from 'react-native-paper';

type Tab = 'pathologies' | 'medications' | 'notes';

const TABS: { value: Tab; label: string; icon: string }[] = [
  { value: 'pathologies', label: 'Patologías', icon: 'medical-bag' },
  { value: 'medications', label: 'Medicamentos', icon: 'pill' },
  { value: 'notes', label: 'Notas médicas', icon: 'note-text' },
];

export default function MedicalHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const { isAdmin, isProfessional } = usePermissions();
  const canEdit = isAdmin || isProfessional;

  const [tab, setTab] = useState<Tab>('pathologies');
  const { pathologies, medications, medicalNotes, isLoading, loadAll, removePathology, removeMedication, removeMedicalNote } = useMedicalHistoryStore();

  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; type: 'pathology' | 'medication' | 'note'; itemId: number }>({
    visible: false,
    type: 'pathology',
    itemId: 0,
  });

  useFocusEffect(useCallback(() => {
    if (id) loadAll(Number(id));
  }, [id, loadAll]));

  const handleDeletePathology = (pathologyId: number) => {
    setConfirmDialog({ visible: true, type: 'pathology', itemId: pathologyId });
  };

  const handleDeleteMedication = (medicationId: number) => {
    setConfirmDialog({ visible: true, type: 'medication', itemId: medicationId });
  };

  const handleDeleteNote = (noteId: number) => {
    setConfirmDialog({ visible: true, type: 'note', itemId: noteId });
  };

  const handleConfirmDelete = () => {
    const { type, itemId } = confirmDialog;
    if (type === 'pathology') removePathology(Number(id), itemId);
    else if (type === 'medication') removeMedication(Number(id), itemId);
    else if (type === 'note') removeMedicalNote(Number(id), itemId);
    setConfirmDialog((prev) => ({ ...prev, visible: false }));
  };

  const dialogConfig: Record<string, { title: string; message: string }> = {
    pathology: { title: 'Eliminar patología', message: '¿Está seguro de eliminar esta patología?' },
    medication: { title: 'Eliminar medicamento', message: '¿Está seguro de eliminar este medicamento?' },
    note: { title: 'Eliminar nota', message: '¿Está seguro de eliminar esta nota?' },
  };

  if (isLoading) return <MedicalHistorySkeleton />;

  const renderTabContent = () => {
    if (tab === 'pathologies') {
      if (pathologies.length === 0) {
        return (
          <AppCard style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <MaterialCommunityIcons name="medical-bag" size={40} color={theme.colors.outline} />
              <Text style={styles.emptyTitle}>Sin patologías registradas</Text>
              <Text style={styles.emptyText}>
                {canEdit ? 'Agregue las patologías o condiciones médicas del adulto mayor.' : 'No hay patologías registradas.'}
              </Text>
            </View>
          </AppCard>
        );
      }
      return (
        <View style={styles.list}>
          {pathologies.map((p) => (
            <PathologyCard
              key={p.id}
              pathology={p}
              canEdit={canEdit}
              onPress={() => router.push(`/(app)/patients/${id}/medical-history/add-pathology?pathologyId=${p.id}` as never)}
              onEdit={() => router.push(`/(app)/patients/${id}/medical-history/add-pathology?pathologyId=${p.id}` as never)}
              onDelete={() => handleDeletePathology(Number(p.id))}
            />
          ))}
        </View>
      );
    }

    if (tab === 'medications') {
      if (medications.length === 0) {
        return (
          <AppCard style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <MaterialCommunityIcons name="pill" size={40} color={theme.colors.outline} />
              <Text style={styles.emptyTitle}>Sin medicamentos registrados</Text>
              <Text style={styles.emptyText}>
                {canEdit ? 'Agregue los medicamentos que toma el adulto mayor.' : 'No hay medicamentos registrados.'}
              </Text>
            </View>
          </AppCard>
        );
      }
      return (
        <View style={styles.list}>
          {medications.map((m) => (
            <MedicationCard
              key={m.id}
              medication={m}
              canEdit={canEdit}
              onPress={() => router.push(`/(app)/patients/${id}/medical-history/add-medication?medicationId=${m.id}` as never)}
              onEdit={() => router.push(`/(app)/patients/${id}/medical-history/add-medication?medicationId=${m.id}` as never)}
              onDelete={() => handleDeleteMedication(Number(m.id))}
            />
          ))}
        </View>
      );
    }

    if (tab === 'notes') {
      if (medicalNotes.length === 0) {
        return (
          <AppCard style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <MaterialCommunityIcons name="note-text" size={40} color={theme.colors.outline} />
              <Text style={styles.emptyTitle}>Sin notas médicas</Text>
              <Text style={styles.emptyText}>
                {canEdit ? 'Agregue antecedentes, alergias, limitaciones u observaciones.' : 'No hay notas médicas registradas.'}
              </Text>
            </View>
          </AppCard>
        );
      }
      return (
        <View style={styles.list}>
          {medicalNotes.map((n) => (
            <MedicalNoteCard
              key={n.id}
              tipoNota={n.tipoNota}
              contenido={n.contenido}
              creadoEn={n.creadoEn}
              canEdit={canEdit}
              onPress={() => router.push(`/(app)/patients/${id}/medical-history/add-note?noteId=${n.id}` as never)}
              onEdit={() => router.push(`/(app)/patients/${id}/medical-history/add-note?noteId=${n.id}` as never)}
              onDelete={() => handleDeleteNote(Number(n.id))}
            />
          ))}
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        buttons={TABS.map((t) => ({
          value: t.value,
          label: t.label,
          showSelectedCheck: true,
        }))}
        style={styles.tabs}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {confirmDialog.visible && (
        <AppConfirmDialog
          visible={confirmDialog.visible}
          title={dialogConfig[confirmDialog.type].title}
          message={dialogConfig[confirmDialog.type].message}
          confirmLabel="Eliminar"
          destructive
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDialog((prev) => ({ ...prev, visible: false }))}
        />
      )}

      {canEdit && (
        <View style={styles.fabContainer}>
          <AppButton
            label={
              tab === 'pathologies' ? 'Agregar patología' :
              tab === 'medications' ? 'Agregar medicamento' :
              'Agregar nota'
            }
            variant="filled"
            icon={
              tab === 'pathologies' ? 'medical-bag' :
              tab === 'medications' ? 'pill' :
              'note-plus'
            }
            onPress={() => {
              if (tab === 'pathologies') router.push(`/(app)/patients/${id}/medical-history/add-pathology` as never);
              else if (tab === 'medications') router.push(`/(app)/patients/${id}/medical-history/add-medication` as never);
              else router.push(`/(app)/patients/${id}/medical-history/add-note` as never);
            }}
            accessibilityLabel={`Agregar ${tab === 'pathologies' ? 'patología' : tab === 'medications' ? 'medicamento' : 'nota médica'}`}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  tabs: { marginHorizontal: 16, marginTop: 12, marginBottom: 8 },
  scroll: { paddingHorizontal: 16, flexGrow: 1 },
  list: { gap: 4 },
  emptyCard: { marginTop: 24 },
  emptyContent: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  emptyTitle: { fontFamily: 'Montserrat_600SemiBold', fontSize: 16, color: '#1f2937' },
  emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 18 },
  bottomPadding: { height: 100 },
  fabContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
});
