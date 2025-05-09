// app/_components/DifficultyBlocks.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface DifficultyBlocksProps {
  value: number;
  onValueChange: (value: number) => void;
}

export default function DifficultyBlocks({ value = 1, onValueChange }: DifficultyBlocksProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tableContainer}>
        <View style={[styles.tableRow, { overflow: 'hidden', borderRadius: 8 }]}>
          <TouchableOpacity 
            style={[
              styles.cell,
              { 
                backgroundColor: value >= 1 ? '#32CD32' : '#e0e0e0',
                borderRightWidth: 1,
                borderRightColor: '#ccc',
              }
            ]}
            onPress={() => onValueChange(1)}
          />
          <TouchableOpacity 
            style={[
              styles.cell,
              { 
                backgroundColor: value >= 2 ? '#b3ff00' : '#e0e0e0',
                borderRightWidth: 1,
                borderRightColor: '#ccc',
              }
            ]}
            onPress={() => onValueChange(2)}
          />
          <TouchableOpacity 
            style={[
              styles.cell,
              { 
                backgroundColor: value >= 3 ? '#ffcc00' : '#e0e0e0',
                borderRightWidth: 1,
                borderRightColor: '#ccc',
              }
            ]}
            onPress={() => onValueChange(3)}
          />
          <TouchableOpacity 
            style={[
              styles.cell,
              { 
                backgroundColor: value >= 4 ? '#ff8000' : '#e0e0e0',
                borderRightWidth: 1,
                borderRightColor: '#ccc',
              }
            ]}
            onPress={() => onValueChange(4)}
          />
          <TouchableOpacity 
            style={[
              styles.cell,
              { backgroundColor: value >= 5 ? '#ff0000' : '#e0e0e0' }
            ]}
            onPress={() => onValueChange(5)}
          />
        </View>
      </View>
      
      <View style={styles.labels}>
        <Text style={styles.label}>Easy</Text>
        <Text style={styles.label}>Moderate</Text>
        <Text style={styles.label}>Hard</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  tableContainer: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  tableRow: {
    flexDirection: 'row',
    height: 50,
    padding: 0,
    margin: 0,
    gap: 0,
  },
  cell: {
    flex: 1,
    height: 50,
    margin: 0,
    padding: 0,
    borderWidth: 0.5,
    borderColor: '#f5f5f5', // Matches the container background
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
});