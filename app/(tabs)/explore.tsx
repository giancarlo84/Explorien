// app/(tabs)/explore.tsx

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

export default function ExploreScreen() {
  const [categories, setCategories] = useState<
    { id: string; displayName: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // fire up on mount
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        const cats = snap.docs.map((doc) => ({
          id: doc.id,
          displayName: doc.data().displayName as string,
        }));
        // desired order:
        const order = [
          'Land',
          'Water',
          'Air',
          'Ice_Snow',
          'ATV',
          'Urban',
        ];
        // sort by that
        cats.sort((a, b) => {
          const ai = order.indexOf(a.id);
          const bi = order.indexOf(b.id);
          return (ai === -1 ? order.length : ai) -
                 (bi === -1 ? order.length : bi);
        });
        setCategories(cats);
      } catch (err) {
        console.error('Firebase explore load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // your secondary colors
  const colors: Record<string, string> = {
    Land: '#4CAF50',
    Water: '#2196F3',
    Air: '#FFD700',
    Ice_Snow: '#BBDEFB',
    ATV: '#F44336',
    Urban: '#9E9E9E',
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Explore</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Categories</Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            style={{ marginVertical: 20 }}
            color="#2196F3"
          />
        ) : (
          <View style={styles.categoriesGrid}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                style={[
                  styles.categoryCard,
                  { backgroundColor: colors[cat.id] || '#888' },
                ]}
                onPress={() => router.push(`/categories/${cat.id}`)}
              >
                <Text style={styles.categoryText}>
                  {cat.displayName}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* You can keep or re-add your Featured Challenges section below */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#2196F3',
    padding: 15,
    alignItems: 'center',
  },
  headerText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  categoryCard: {
    width: '48%',
    height: 100,
    borderRadius: 10,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  categoryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});



