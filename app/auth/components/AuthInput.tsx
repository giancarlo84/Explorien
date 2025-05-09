// app/auth/components/AuthInput.tsx
import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';

interface AuthInputProps extends TextInputProps {
  // Add any custom props
}

export default function AuthInput(props: AuthInputProps) {
  return (
    <TextInput
      style={styles.input}
      placeholderTextColor="#999"
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
});