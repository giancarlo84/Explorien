import React from 'react';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Explorien</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.welcomeText}>Welcome to Explorien!</Text>
        <Text style={styles.subtitleText}>Your adventure starts here</Text>
        
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>Popular Adventures</Text>
          {/* Mock content for now */}
          <View style={styles.adventureItem}>
            <Text style={styles.adventureName}>Mountain Hiking</Text>
            <Text style={styles.adventureDetails}>5.2 miles • Moderate • 4.8 ★</Text>
          </View>
          
          <View style={styles.adventureItem}>
            <Text style={styles.adventureName}>City Explorer</Text>
            <Text style={styles.adventureDetails}>2.8 miles • Easy • 4.5 ★</Text>
          </View>
          
          <View style={styles.adventureItem}>
            <Text style={styles.adventureName}>Kayak Adventure</Text>
            <Text style={styles.adventureDetails}>3.0 miles • Challenging • 4.9 ★</Text>
          </View>
        </View>
      </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 30,
  },
  featuresContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  adventureItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  adventureName: {
    fontSize: 16,
    fontWeight: '600',
  },
  adventureDetails: {
    color: '#777',
    marginTop: 4,
  },
});
