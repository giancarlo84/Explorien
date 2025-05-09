import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function ActivityDetailScreen() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      try {
        if (activityId) {
          const docRef = doc(db, 'activities', activityId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setActivity(docSnap.data());
          } else {
            console.warn('Activity not found');
          }
        }
      } catch (error) {
        console.error('Error loading activity:', error);
      } finally {
        setLoading(false);
      }
    }
    loadActivity();
  }, [activityId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Activity Details</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : activity ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{activity.title || 'Untitled Activity'}</Text>
          <Text style={styles.label}>Description:</Text>
          <Text style={styles.value}>{activity.description || 'No description provided.'}</Text>

          <Text style={styles.label}>Category:</Text>
          <Text style={styles.value}>{activity.category || 'Uncategorized'}</Text>

          <Text style={styles.label}>Activity Type:</Text>
          <Text style={styles.value}>{activity.activityType || 'Not specified'}</Text>

          {/* You can add more fields here if needed */}
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Text style={styles.errorText}>Activity not found.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 15,
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
  },
  value: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});
