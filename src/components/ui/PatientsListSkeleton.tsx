import { SkeletonBox } from '@/src/components/ui/SkeletonBox';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export function PatientsListSkeleton() {
    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <View style={styles.searchRow}>
                    <SkeletonBox width="100%" height={48} borderRadius={12} />
                    <SkeletonBox width={48} height={48} borderRadius={12} delay={60} />
                </View>
            </View>

            <View style={styles.list}>
                {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={styles.card}>
                        <View style={styles.row}>
                            <SkeletonBox width={48} height={48} borderRadius={24} delay={i * 80} />
                            <View style={styles.info}>
                                <View style={styles.nameRow}>
                                    <SkeletonBox width="65%" height={15} borderRadius={4} delay={i * 80 + 40} />
                                    <SkeletonBox width={70} height={20} borderRadius={10} delay={i * 80 + 60} />
                                </View>
                                <SkeletonBox width="45%" height={12} borderRadius={4} delay={i * 80 + 80} />
                                <SkeletonBox width="50%" height={12} borderRadius={4} delay={i * 80 + 100} />
                            </View>
                            <SkeletonBox width={24} height={24} borderRadius={4} delay={i * 80 + 120} />
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.fab}>
                <SkeletonBox width={56} height={56} borderRadius={16} delay={300} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        gap: 4,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginVertical: 6,
        elevation: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    info: {
        flex: 1,
        gap: 6,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
});
