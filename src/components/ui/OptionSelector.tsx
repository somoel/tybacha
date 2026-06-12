import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Chip } from 'react-native-paper';

interface Option {
  value: string;
  label: string;
  icon?: string;
}

interface OptionSelectorProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  style?: ViewStyle;
}

/**
 * Chip-based selector that wraps into multiple rows.
 * Use instead of SegmentedButtons when labels are long or there are 4+ options.
 */
export function OptionSelector({ options, value, onChange, style }: OptionSelectorProps) {
  return (
    <View style={[styles.container, style]} accessibilityRole="radiogroup">
      {options.map((option) => (
        <Chip
          key={option.value}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
          showSelectedOverlay={false}
          icon={option.icon}
          accessibilityRole="radio"
          accessibilityState={{ selected: option.value === value }}
          style={[
            styles.chip,
            option.value === value && styles.chipSelected,
          ]}
          textStyle={[
            styles.label,
            option.value === value && styles.labelSelected,
          ]}
        >
          {option.label}
        </Chip>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    backgroundColor: '#f0f3f6',
  },
  chipSelected: {
    backgroundColor: '#b2dfdb',
  },
  label: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#374151',
  },
  labelSelected: {
    color: '#004d40',
  },
});
