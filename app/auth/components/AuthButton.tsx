// app/auth/components/AuthButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}

export default function AuthButton({ 
  title, 
  onPress, 
  loading = false, 
  disabled = false,
  secondary = false
}: AuthButtonProps) {
  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        secondary ? styles.secondaryButton : null,
        disabled ? styles.disabledButton : null
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? '#FF6B00' : '#FFFFFF'} />
      ) : (
        <Text style={[styles.buttonText, secondary ? styles.secondaryButtonText : null]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF6B00',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
  secondaryButtonText: {
    color: '#FF6B00',
  },
  disabledButton: {
    opacity: 0.6,
  },
});