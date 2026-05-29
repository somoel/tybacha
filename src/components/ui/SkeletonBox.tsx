import React, { useEffect } from 'react';
import { StyleSheet, type DimensionValue, type ViewStyle, View } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';

interface SkeletonBoxProps {
    width: DimensionValue;
    height: number;
    borderRadius?: number;
    style?: ViewStyle;
    delay?: number;
}

/**
 * Animated skeleton placeholder box with a subtle pulse effect.
 */
export function SkeletonBox({
    width,
    height,
    borderRadius = 8,
    style,
    delay = 0,
}: SkeletonBoxProps) {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withDelay(
            delay,
            withRepeat(
                withTiming(0.7, {
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                }),
                -1,
                true,
            ),
        );
    }, [delay, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <View style={[{ width, height, borderRadius }, style]}>
            <Animated.View style={[styles.box, StyleSheet.absoluteFill, animatedStyle]} />
        </View>
    );
}

const styles = StyleSheet.create({
    box: {
        backgroundColor: '#e2e8f0',
        borderRadius: 8,
    },
});
