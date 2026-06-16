import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';

interface ShimmerOverlayProps {
    visible?: boolean;
    children: React.ReactNode;
}

export function ShimmerOverlay({ visible = false, children }: ShimmerOverlayProps) {
    const translateX = useSharedValue(-120);

    useEffect(() => {
        if (visible) {
            translateX.value = withRepeat(
                withTiming(320, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                -1,
                false,
            );
        } else {
            translateX.value = -120;
        }
    }, [visible, translateX]);

    const shimmerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    return (
        <View style={styles.container}>
            {children}
            {visible && (
                <Animated.View style={[styles.shimmerContainer, shimmerStyle]} pointerEvents="none">
                    <LinearGradient
                        colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradient}
                    />
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignSelf: 'stretch',
        overflow: 'hidden',
    },
    shimmerContainer: {
        ...StyleSheet.absoluteFillObject,
        width: 120,
    },
    gradient: {
        flex: 1,
    },
});
