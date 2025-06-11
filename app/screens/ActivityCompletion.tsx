// screens/ActivityCompletion.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Share
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type CompletionParams = {
  activityId: string;
  title: string;
  duration: string;
  distance: string;
  mode: string;
};

export default function ActivityCompletion() {
  const params = useLocalSearchParams<CompletionParams>();
  const { activityId, title, duration, distance, mode } = params;
  const router = useRouter();

  const handleShare = async () => {
    try {
      const distanceKm = parseFloat(distance).toFixed(2);
      const durationParts = duration.split(':');
      const hours = parseInt(durationParts[0]);
      const minutes = parseInt(durationParts[1]);
      const timeText = hours > 0 
        ? `${hours}h ${minutes}m` 
        : `${minutes}m ${parseInt(durationParts[2])}s`;
      
      await Share.share({
        message: 
          `I just completed "${title}" on Explorien!\n` +
          `🔥 Distance: ${distanceKm} km\n` +
          `⏱ Time: ${timeText}\n` +
          `Download Explorien to join the adventure!`,
        title: 'My Explorien Adventure',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Activity Complete!</Text>
      </View>
      
      {/* Activity completion message */}
      <View style={styles.messageContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#FF6B00" />
        <Text style={styles.completionMessage}>
          Great job completing this activity!
        </Text>
      </View>
      
      {/* Activity details */}
      <View style={styles.detailsCard}>
        <Text style={styles.activityTitle}>{title}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={24} color="#FF6B00" />
            <Text style={styles.statValue}>{duration}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          
          <View style={styles.stat}>
            <Ionicons name="speedometer-outline" size={24} color="#2196F3" />
            <Text style={styles.statValue}>{distance} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          
          <View style={styles.stat}>
            <Ionicons name="footsteps-outline" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>{mode}</Text>
            <Text style={styles.statLabel}>Type</Text>
          </View>
        </View>
      </View>
      
      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleShare}
        >
          <Ionicons name="share-social" size={20} color="#fff" />
          <Text style={styles.buttonText}>Share</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.doneButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.buttonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#FF6B00',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  messageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  completionMessage: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  activityTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 30,
    paddingHorizontal: 20,
    gap: 15,
  },
  shareButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  doneButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  }
});