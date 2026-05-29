import { AppCard } from '@/src/components/ui/AppCard';
import { SkeletonBox } from '@/src/components/ui/SkeletonBox';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Skeleton placeholder for the home screen while data loads.
 * Mirrors the exact layout: gradient header, stat cards, patient cards, activity feed.
 */
export function HomeSkeleton() {
    return (
        <View style={styles.container}>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Gradient header skeleton */}
                <LinearGradient
                    colors={['#006d77', '#80cbc4']}
                    style={styles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <SafeAreaView edges={['top']} style={styles.headerContent}>
                        <SkeletonBox width={100} height={16} borderRadius={4} />
                        <SkeletonBox width={160} height={24} borderRadius={4} delay={100} style={{ marginTop: 6 }} />
                        <SkeletonBox width={70} height={20} borderRadius={10} delay={200} style={{ marginTop: 10 }} />
                    </SafeAreaView>
                </LinearGradient>

                <View style={styles.content}>
                    {/* Stats row skeleton */}
                    <View style={styles.statsRow}>
                        <AppCard style={styles.statCard}>
                            <View style={styles.statContent}>
                                <SkeletonBox width={28} height={28} borderRadius={14} />
                                <SkeletonBox width={36} height={24} borderRadius={4} delay={100} />
                                <SkeletonBox width={80} height={11} borderRadius={4} delay={150} />
                            </View>
                        </AppCard>
                        <AppCard style={styles.statCard}>
                            <View style={styles.statContent}>
                                <SkeletonBox width={28} height={28} borderRadius={14} delay={50} />
                                <SkeletonBox width={36} height={24} borderRadius={4} delay={150} />
                                <SkeletonBox width={90} height={11} borderRadius={4} delay={200} />
                            </View>
                        </AppCard>
                        <AppCard style={styles.statCard}>
                            <View style={styles.statContent}>
                                <SkeletonBox width={28} height={28} borderRadius={14} delay={100} />
                                <SkeletonBox width={36} height={24} borderRadius={4} delay={200} />
                                <SkeletonBox width={85} height={11} borderRadius={4} delay={250} />
                            </View>
                        </AppCard>
                    </View>

                    {/* Section title skeleton */}
                    <SkeletonBox width={180} height={18} borderRadius={4} delay={100} style={{ marginBottom: 12 }} />

                    {/* Patient card skeletons */}
                    {[0, 1, 2].map((i) => (
                        <AppCard key={i}>
                            <View style={styles.patientRow}>
                                <SkeletonBox width={48} height={48} borderRadius={24} delay={i * 80} />
                                <View style={styles.patientInfo}>
                                    <SkeletonBox width="60%" height={15} borderRadius={4} delay={i * 80 + 40} />
                                    <SkeletonBox width="40%" height={12} borderRadius={4} delay={i * 80 + 80} />
                                    <SkeletonBox width="50%" height={12} borderRadius={4} delay={i * 80 + 120} />
                                </View>
                            </View>
                        </AppCard>
                    ))}

                    {/* Activity feed skeleton */}
                    <SkeletonBox width={140} height={18} borderRadius={4} delay={150} style={{ marginTop: 24, marginBottom: 12 }} />
                    <AppCard>
                        {[0, 1, 2].map((i) => (
                            <View key={i} style={[styles.activityRow, i < 2 && styles.activityBorder]}>
                                <SkeletonBox width={36} height={36} borderRadius={18} delay={i * 80} />
                                <View style={styles.activityInfo}>
                                    <SkeletonBox width="55%" height={13} borderRadius={4} delay={i * 80 + 40} />
                                    <SkeletonBox width="35%" height={11} borderRadius={4} delay={i * 80 + 80} />
                                </View>
                            </View>
                        ))}
                    </AppCard>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scroll: {
        flex: 1,
    },
    header: {
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerContent: {
        paddingTop: 24,
        paddingBottom: 32,
        paddingHorizontal: 24,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 100,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
    },
    statContent: {
        alignItems: 'center',
        gap: 6,
    },
    patientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    patientInfo: {
        flex: 1,
        gap: 6,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
    },
    activityBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f3f6',
    },
    activityInfo: {
        flex: 1,
        gap: 4,
    },
});
