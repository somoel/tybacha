import { SkeletonBox } from '@/src/components/ui/SkeletonBox';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export function PatientDetailSkeleton() {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
                <View style={styles.patientHeader}>
                    <SkeletonBox width={56} height={56} borderRadius={28} />
                    <View style={styles.patientInfo}>
                        <SkeletonBox width="70%" height={18} borderRadius={4} delay={40} />
                        <SkeletonBox width="45%" height={13} borderRadius={4} delay={80} />
                        <SkeletonBox width="55%" height={13} borderRadius={4} delay={120} />
                    </View>
                </View>
            </View>

            <View style={styles.card}>
                <View style={styles.navRow}>
                    <SkeletonBox width={22} height={22} borderRadius={4} delay={60} />
                    <View style={styles.navInfo}>
                        <SkeletonBox width="40%" height={15} borderRadius={4} delay={100} />
                        <SkeletonBox width="55%" height={12} borderRadius={4} delay={140} />
                    </View>
                    <SkeletonBox width={20} height={20} borderRadius={4} delay={100} />
                </View>
            </View>

            <View style={styles.card}>
                <View style={styles.navRow}>
                    <SkeletonBox width={22} height={22} borderRadius={4} delay={80} />
                    <View style={styles.navInfo}>
                        <SkeletonBox width="40%" height={15} borderRadius={4} delay={120} />
                        <SkeletonBox width="55%" height={12} borderRadius={4} delay={160} />
                    </View>
                    <SkeletonBox width={20} height={20} borderRadius={4} delay={120} />
                </View>
            </View>

            <View style={styles.actions}>
                <SkeletonBox width="100%" height={48} borderRadius={12} delay={100} />
                <SkeletonBox width="100%" height={48} borderRadius={12} delay={140} />
                <SkeletonBox width="100%" height={48} borderRadius={12} delay={180} />
            </View>

            <View style={styles.divider} />

            <SkeletonBox width="50%" height={16} borderRadius={4} delay={160} style={{ marginBottom: 12 }} />

            {[0, 1, 2].map((i) => (
                <View key={i} style={styles.card}>
                    <View style={styles.batteryRow}>
                        <SkeletonBox width={24} height={24} borderRadius={4} delay={i * 60 + 120} />
                        <View style={styles.batteryInfo}>
                            <SkeletonBox width="60%" height={14} borderRadius={4} delay={i * 60 + 160} />
                            <SkeletonBox width="35%" height={12} borderRadius={4} delay={i * 60 + 200} />
                        </View>
                        <SkeletonBox width={20} height={20} borderRadius={4} delay={i * 60 + 200} />
                    </View>
                </View>
            ))}

            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

export function BatteryListSkeleton() {
    return (
        <View style={styles.container}>
            <View style={styles.listPadding}>
                {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={styles.card}>
                        <View style={styles.batteryRow}>
                            <SkeletonBox width={28} height={28} borderRadius={4} delay={i * 60} />
                            <View style={styles.batteryInfo}>
                                <SkeletonBox width="65%" height={14} borderRadius={4} delay={i * 60 + 40} />
                                <SkeletonBox width="40%" height={12} borderRadius={4} delay={i * 60 + 80} />
                            </View>
                            <SkeletonBox width={20} height={20} borderRadius={4} delay={i * 60 + 80} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

export function BatteryDetailSkeleton() {
    return (
        <ScrollView style={styles.scrollPadding} showsVerticalScrollIndicator={false}>
            <View style={[styles.card, { marginBottom: 16 }]}>
                <SkeletonBox width="70%" height={16} borderRadius={4} />
                <SkeletonBox width="45%" height={13} borderRadius={4} delay={40} style={{ marginTop: 6 }} />
                <SkeletonBox width="55%" height={13} borderRadius={4} delay={80} style={{ marginTop: 8 }} />
            </View>

            <View style={[styles.card, { marginBottom: 16 }]}>
                <SkeletonBox width="100%" height={200} borderRadius={8} delay={60} />
            </View>

            <SkeletonBox width="55%" height={16} borderRadius={4} delay={80} style={{ marginBottom: 12, marginTop: 16 }} />

            {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.card}>
                    <View style={styles.resultRow}>
                        <View style={styles.resultInfo}>
                            <SkeletonBox width="70%" height={14} borderRadius={4} delay={i * 40 + 80} />
                            <SkeletonBox width="40%" height={12} borderRadius={4} delay={i * 40 + 120} />
                        </View>
                        <View style={styles.resultValue}>
                            <SkeletonBox width={48} height={22} borderRadius={4} delay={i * 40 + 100} />
                            <SkeletonBox width={30} height={11} borderRadius={4} delay={i * 40 + 140} />
                        </View>
                    </View>
                </View>
            ))}

            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

export function ConsentsListSkeleton() {
    return (
        <View style={styles.container}>
            <View style={styles.statusBanner}>
                <View style={styles.statusRow}>
                    <SkeletonBox width={24} height={24} borderRadius={4} />
                    <View style={styles.statusInfo}>
                        <SkeletonBox width="55%" height={15} borderRadius={4} delay={40} />
                        <SkeletonBox width="70%" height={12} borderRadius={4} delay={80} />
                    </View>
                </View>
            </View>

            <View style={styles.listPadding}>
                {[0, 1, 2].map((i) => (
                    <View key={i} style={[styles.card, { marginBottom: 12 }]}>
                        <View style={styles.consentHeader}>
                            <View style={styles.consentTypeRow}>
                                <SkeletonBox width={20} height={20} borderRadius={4} delay={i * 60} />
                                <SkeletonBox width="40%" height={15} borderRadius={4} delay={i * 60 + 40} />
                            </View>
                            <SkeletonBox width={70} height={24} borderRadius={12} delay={i * 60 + 60} />
                        </View>
                        <SkeletonBox width="65%" height={13} borderRadius={4} delay={i * 60 + 80} style={{ marginTop: 8 }} />
                        <SkeletonBox width="50%" height={12} borderRadius={4} delay={i * 60 + 100} style={{ marginTop: 4 }} />
                    </View>
                ))}
            </View>

            <View style={styles.fabFull}>
                <SkeletonBox width="100%" height={48} borderRadius={12} delay={200} />
            </View>
        </View>
    );
}

export function MedicalHistorySkeleton() {
    return (
        <View style={styles.container}>
            <View style={styles.tabsSkeleton}>
                <View style={styles.tabRow}>
                    <SkeletonBox width="32%" height={40} borderRadius={8} />
                    <SkeletonBox width="34%" height={40} borderRadius={8} delay={40} />
                    <SkeletonBox width="34%" height={40} borderRadius={8} delay={80} />
                </View>
            </View>

            <View style={styles.scrollSkeleton}>
                {[0, 1, 2].map((i) => (
                    <View key={i} style={styles.card}>
                        <View style={styles.medicalRow}>
                            <SkeletonBox width={40} height={40} borderRadius={8} delay={i * 60} />
                            <View style={styles.medicalInfo}>
                                <SkeletonBox width="55%" height={14} borderRadius={4} delay={i * 60 + 40} />
                                <SkeletonBox width="35%" height={12} borderRadius={4} delay={i * 60 + 80} />
                            </View>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.fabFull}>
                <SkeletonBox width="100%" height={48} borderRadius={12} delay={200} />
            </View>
        </View>
    );
}

export function AlertsListSkeleton() {
    return (
        <View style={styles.container}>
            <View style={styles.listPadding}>
                {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={[styles.card, { marginBottom: 12 }]}>
                        <View style={styles.alertHeader}>
                            <View style={styles.alertInfo}>
                                <SkeletonBox width="55%" height={15} borderRadius={4} delay={i * 60} />
                                <SkeletonBox width="30%" height={12} borderRadius={4} delay={i * 60 + 40} />
                            </View>
                            <SkeletonBox width={70} height={24} borderRadius={12} delay={i * 60 + 60} />
                        </View>
                        <SkeletonBox width="85%" height={13} borderRadius={4} delay={i * 60 + 80} style={{ marginTop: 8 }} />
                        <SkeletonBox width="45%" height={12} borderRadius={4} delay={i * 60 + 100} style={{ marginTop: 8 }} />
                    </View>
                ))}
            </View>

            <View style={styles.fabFull}>
                <SkeletonBox width="100%" height={48} borderRadius={12} delay={200} />
            </View>
        </View>
    );
}

export function ExerciseSkeleton() {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
                <SkeletonBox width="100%" height={100} borderRadius={8} />
            </View>

            <View style={styles.card}>
                <SkeletonBox width="100%" height={60} borderRadius={8} delay={60} />
            </View>

            <SkeletonBox width="40%" height={16} borderRadius={4} delay={80} style={{ marginBottom: 8, marginTop: 8 }} />

            <View style={styles.card}>
                <SkeletonBox width="30%" height={14} borderRadius={4} delay={80} style={{ marginBottom: 8 }} />
                {[0, 1].map((j) => (
                    <View key={j} style={styles.exerciseRow}>
                        <SkeletonBox width={20} height={20} borderRadius={10} delay={j * 40 + 100} />
                        <View style={styles.exerciseInfo}>
                            <SkeletonBox width="60%" height={13} borderRadius={4} delay={j * 40 + 120} />
                            <SkeletonBox width="35%" height={11} borderRadius={4} delay={j * 40 + 140} />
                        </View>
                        <SkeletonBox width={32} height={22} borderRadius={6} delay={j * 40 + 120} />
                    </View>
                ))}
            </View>

            <View style={styles.card}>
                <SkeletonBox width="30%" height={14} borderRadius={4} delay={120} style={{ marginBottom: 8 }} />
                {[0, 1].map((j) => (
                    <View key={j} style={styles.exerciseRow}>
                        <SkeletonBox width={20} height={20} borderRadius={10} delay={j * 40 + 140} />
                        <View style={styles.exerciseInfo}>
                            <SkeletonBox width="55%" height={13} borderRadius={4} delay={j * 40 + 160} />
                            <SkeletonBox width="30%" height={11} borderRadius={4} delay={j * 40 + 180} />
                        </View>
                        <SkeletonBox width={32} height={22} borderRadius={6} delay={j * 40 + 160} />
                    </View>
                ))}
            </View>

            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

export function ProgressSkeleton() {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <SkeletonBox width="40%" height={14} borderRadius={4} delay={20} style={{ marginBottom: 12, marginTop: 4 }} />

            <View style={[styles.card, { marginBottom: 16 }]}>
                <View style={styles.summaryHeader}>
                    <SkeletonBox width={20} height={20} borderRadius={4} />
                    <SkeletonBox width="35%" height={16} borderRadius={4} delay={40} />
                </View>
                <SkeletonBox width="45%" height={12} borderRadius={4} delay={60} style={{ marginBottom: 16, marginTop: 4 }} />

                <View style={styles.summaryStats}>
                    {[0, 1, 2, 3].map((s) => (
                        <React.Fragment key={s}>
                            {s > 0 && <View style={styles.statDivider} />}
                            <View style={styles.statItem}>
                                <SkeletonBox width={40} height={22} borderRadius={4} delay={s * 30 + 60} />
                                <SkeletonBox width={50} height={11} borderRadius={4} delay={s * 30 + 80} style={{ marginTop: 4 }} />
                            </View>
                        </React.Fragment>
                    ))}
                </View>
            </View>

            <View style={styles.card}>
                <SkeletonBox width="100%" height={180} borderRadius={8} delay={80} />
            </View>

            <View style={styles.card}>
                <SkeletonBox width="100%" height={80} borderRadius={8} delay={120} />
            </View>

            <SkeletonBox width="40%" height={16} borderRadius={4} delay={140} style={{ marginBottom: 10, marginTop: 8 }} />

            {[0, 1, 2].map((i) => (
                <View key={i} style={styles.card}>
                    <View style={styles.historyRow}>
                        <SkeletonBox width={36} height={36} borderRadius={18} delay={i * 60 + 140} />
                        <View style={styles.historyInfo}>
                            <SkeletonBox width="55%" height={14} borderRadius={4} delay={i * 60 + 180} />
                            <SkeletonBox width="35%" height={11} borderRadius={4} delay={i * 60 + 220} />
                        </View>
                        <View style={styles.historyValue}>
                            <SkeletonBox width={36} height={18} borderRadius={4} delay={i * 60 + 200} />
                            <SkeletonBox width={24} height={10} borderRadius={4} delay={i * 60 + 240} />
                        </View>
                    </View>
                </View>
            ))}

            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollPadding: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 16,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginVertical: 6,
        elevation: 1,
    },
    bottomPadding: {
        height: 32,
    },
    listPadding: {
        padding: 16,
    },
    scrollSkeleton: {
        paddingHorizontal: 16,
        paddingTop: 8,
        flexGrow: 1,
    },
    patientHeader: {
        flexDirection: 'row',
        gap: 14,
        alignItems: 'center',
    },
    patientInfo: {
        flex: 1,
        gap: 4,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    navInfo: {
        flex: 1,
        gap: 4,
    },
    actions: {
        gap: 8,
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 12,
        marginHorizontal: 16,
    },
    batteryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    batteryInfo: {
        flex: 1,
        gap: 4,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resultInfo: {
        flex: 1,
        gap: 4,
    },
    resultValue: {
        alignItems: 'flex-end',
        gap: 2,
    },
    statusBanner: {
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 4,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        elevation: 1,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statusInfo: {
        flex: 1,
        gap: 4,
    },
    consentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    consentTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    fabFull: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
    },
    tabsSkeleton: {
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
    },
    tabRow: {
        flexDirection: 'row',
        gap: 8,
    },
    medicalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    medicalInfo: {
        flex: 1,
        gap: 4,
    },
    alertHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    alertInfo: {
        flex: 1,
        gap: 4,
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
    },
    exerciseInfo: {
        flex: 1,
        gap: 2,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    summaryStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: '#e5e7eb',
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    historyInfo: {
        flex: 1,
        gap: 4,
    },
    historyValue: {
        alignItems: 'flex-end',
        gap: 2,
    },
});
