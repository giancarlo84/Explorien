import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function CategoryActivitiesScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
  async function loadActivities() {
   try {
    if (!categoryId) {
      console.warn("No categoryId provided");
      setActivities([]);
      return;
    }
    
    setLoading(true);
    const fetchedActivities = [];
    
    // Get all activity types for this category
    const activityTypesRef = collection(doc(db, 'categories', categoryId), 'activities');
    const activityTypesSnap = await getDocs(activityTypesRef);
    
    // For each activity type
    for (const activityTypeDoc of activityTypesSnap.docs) {
      const activityTypeId = activityTypeDoc.id;
      
      // Get all items
      const itemsRef = collection(doc(activityTypesRef, activityTypeId), 'items');
      const itemsSnap = await getDocs(itemsRef);
      
      // Process each item
      itemsSnap.docs.forEach(itemDoc => {
        fetchedActivities.push({
          id: itemDoc.id,
          itemId: itemDoc.id,
          activityTypeId: activityTypeId,
          categoryId: categoryId,
          ...itemDoc.data()
        });
      });
    }
    
    setActivities(fetchedActivities);
  } catch (error) {
    console.error('Error loading activities for category:', error);
    setActivities([]);
  } finally {
    setLoading(false);
  }
}
    
    loadActivities();
  }, [categoryId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{categoryId} Activities</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {activities.length > 0 ? (
            activities.map(activity => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityCard}
                onPress={() => router.push({
                  pathname: `/activities/${activity.id}`,
                  params: { categoryId: categoryId }
                })}
              >
                <Text style={styles.activityName}>{activity.title || 'Untitled Activity'}</Text>
                <Text style={styles.activityDescription}>{activity.description || 'No description provided'}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noActivities}>No activities found for this category.</Text>
          )}
        </ScrollView>
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
    textTransform: 'capitalize',
  },
  content: {
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  activityDescription: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
  },
  noActivities: {
    textAlign: 'center',
    color: '#777',
    marginVertical: 20,
    fontSize: 16,
  },
});
