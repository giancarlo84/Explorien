// _components/ActivityMarker.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Marker } from 'react-native-maps';
import getMarkerSvg from './markers';

// Category colors mapping
const categoryColors = {
  'Land': '#81C784',
  'Water': '#64B5F6',
  'Air': '#FFF59D',
  'Ice_Snow': '#E3F2FD',
  'ATV': '#EF9A9A',
  'Urban': '#BDBDBD',
};

type ActivityMarkerProps = {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description: string;
  category: string;
  activity: string;
  displayName?: string;
  size?: number;
  onPress?: (activityId: string) => void;
};

const ActivityMarker = ({ 
  id, 
  coordinate, 
  title, 
  description, 
  category, 
  activity, 
  displayName, 
  size = 36,
  onPress 
}: ActivityMarkerProps) => {
  // Log all data passed to the marker
  console.log('📍 Rendering ActivityMarker:', {
    id, title, description, coordinate, category, activity, displayName
  });

  // Skip rendering if coordinate is invalid
  if (!coordinate || typeof coordinate.latitude !== 'number' || typeof coordinate.longitude !== 'number') {
    console.warn(`❌ Invalid coordinate for activity ${id}, skipping marker.`);
    return null;
  }

  // Defensive fallback for missing activity
  const safeActivity = activity || 'unknown';
  const MarkerIcon = getMarkerSvg(category, safeActivity);
  const markerColor = categoryColors[category] || '#81C784';

  // Display fallback letter
  const fallbackLetter = safeActivity[0]?.toUpperCase() || title?.[0]?.toUpperCase() || '?';

  // Handle marker press
  const handlePress = () => {
    if (onPress) {
      onPress(id);
    }
  };

  return (
    <Marker
      key={id}
      identifier={id}
      coordinate={coordinate}
      tracksViewChanges={true}
      onPress={handlePress}
    >
      <View style={[styles.markerContainer, { backgroundColor: markerColor }]}> 
        <View style={styles.iconWrapper}>
          {MarkerIcon ? (
            <MarkerIcon width={24} height={24} fill="#000000" />
          ) : (
            <Text style={styles.fallbackText}>{fallbackLetter}</Text>
          )}
        </View>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  iconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  }
});

export default ActivityMarker;