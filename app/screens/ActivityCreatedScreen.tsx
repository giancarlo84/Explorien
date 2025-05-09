// app/screens/ActivityCreatedScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Button, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

export default function ActivityCreatedScreen() {
  const router = useRouter();

  const navigateToMap = () => {
    try {
      router.replace('/(tabs)/map');
    } catch (error) {
      console.error('Navigation to map failed:', error);
      try {
        router.replace('/(tabs)/');
      } catch (innerError) {
        console.error('Fallback to tabs failed:', innerError);
        try {
          router.replace('/');
        } catch (finalError) {
          console.error('Fallback to root failed:', finalError);
        }
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(navigateToMap, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>Activity Created!</Text>
        <Text style={styles.message}>Your adventure has been published successfully.</Text>
        <Text style={styles.submessage}>Returning to map in a few seconds...</Text>
        <Button title="Back to Map" onPress={navigateToMap} color="#FF6B00" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emoji: { fontSize: 64, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 10 },
  message: { fontSize: 16, color: '#555', marginBottom: 10, textAlign: 'center' },
  submessage: { fontSize: 14, color: '#888', marginBottom: 30, textAlign: 'center' },
});
