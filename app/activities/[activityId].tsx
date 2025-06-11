import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function ActivityDetailScreen() {
  const { activityId, categoryId, activityTypeId } = useLocalSearchParams<{ activityId: string, categoryId: string, activityTypeId: string }>();
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
  try {
    if (activityId) {
      let foundActivity = null;
      
      // If we have categoryId and activityTypeId from params, use the direct path
      if (categoryId && activityTypeId) {
        console.log(`Loading activity with direct path: categories/${categoryId}/activities/${activityTypeId}/items/${activityId}`);
        
        const docRef = doc(
          collection(
            doc(
              collection(
                doc(db, 'categories', categoryId),
                'activities'
              ),
              activityTypeId
            ),
            'items'
          ),
          activityId
        );
        
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          foundActivity = {
            id: docSnap.id,
            itemId: docSnap.id,
            activityTypeId,
            categoryId,
            ...docSnap.data()
          };
        }
      } 
      // Otherwise, we need to search through all categories
      else {
        console.log(`No direct path available, searching for activity: ${activityId}`);
        
        // Get all categories
        const categoriesSnap = await getDocs(collection(db, 'categories'));
        
        // For each category
        for (const categoryDoc of categoriesSnap.docs) {
          if (foundActivity) break; // Stop if we found it
          
          const catId = categoryDoc.id;
          const activityTypesSnap = await getDocs(collection(doc(db, 'categories', catId), 'activities'));
          
          // For each activity type
          for (const activityTypeDoc of activityTypesSnap.docs) {
            if (foundActivity) break; // Stop if we found it
            
            const actTypeId = activityTypeDoc.id;
            const itemsRef = collection(doc(collection(doc(db, 'categories', catId), 'activities'), actTypeId), 'items');
            
            // Check if this activityId exists in the items collection
            const docSnap = await getDoc(doc(itemsRef, activityId));
            
            if (docSnap.exists()) {
              foundActivity = {
                id: docSnap.id,
                itemId: docSnap.id,
                activityTypeId: actTypeId,
                categoryId: catId,
                ...docSnap.data()
              };
              break;
            }
          }
        }
      }
      
      if (foundActivity) {
        setActivity(foundActivity);
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
  }, [activityId, categoryId]);

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
