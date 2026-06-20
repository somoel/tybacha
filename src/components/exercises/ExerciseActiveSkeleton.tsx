import { SkeletonBox } from '@/src/components/ui/SkeletonBox';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export function ExerciseActiveSkeleton() {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Instruction card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <SkeletonBox width={36} height={36} borderRadius={18} />
                    <SkeletonBox width="60%" height={20} borderRadius={4} delay={60} style={{ marginTop: 8 }} />
                    <SkeletonBox width="90%" height={14} borderRadius={4} delay={120} style={{ marginTop: 6 }} />
                    <SkeletonBox width="70%" height={14} borderRadius={4} delay={160} style={{ marginTop: 4 }} />
                    <View style={styles.chipRow}>
                        <SkeletonBox width={70} height={24} borderRadius={8} delay={200} />
                        <SkeletonBox width={70} height={24} borderRadius={8} delay={240} />
                        <SkeletonBox width={70} height={24} borderRadius={8} delay={280} />
                    </View>
                </View>
            </View>

            {/* Timer / rep counter area */}
            <View style={styles.bigArea}>
                <SkeletonBox width={180} height={56} borderRadius={8} delay={120} />
                <View style={styles.controlsRow}>
                    <SkeletonBox width={44} height={44} borderRadius={22} delay={180} />
                    <SkeletonBox width={64} height={64} borderRadius={32} delay={220} />
                    <SkeletonBox width={44} height={44} borderRadius={22} delay={260} />
                </View>
            </View>

            {/* Notes input */}
            <SkeletonBox width="100%" height={88} borderRadius={12} delay={180} style={{ marginHorizontal: 16, marginTop: 16 }} />

            {/* Metrics card */}
            <View style={styles.metricsCard}>
                <SkeletonBox width="50%" height={16} borderRadius={4} delay={220} style={{ marginBottom: 16 }} />
                <View style={styles.scaleSkeletonRow}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                        <SkeletonBox key={i} width="100%" height={44} borderRadius={8} delay={i * 20 + 240} style={{ flex: 1 }} />
                    ))}
                </View>
                <View style={{ height: 24 }} />
                <View style={styles.scaleSkeletonRow}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                        <SkeletonBox key={i} width="100%" height={44} borderRadius={8} delay={i * 20 + 320} style={{ flex: 1 }} />
                    ))}
                </View>
            </View>

            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 16,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        marginVertical: 6,
        elevation: 1,
    },
    cardHeader: {
        alignItems: 'center',
    },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    bigArea: {
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        marginVertical: 6,
        elevation: 1,
        gap: 16,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    metricsCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginVertical: 6,
        elevation: 1,
    },
    scaleSkeletonRow: {
        flexDirection: 'row',
        gap: 4,
    },
    bottomPadding: {
        height: 32,
    },
});
